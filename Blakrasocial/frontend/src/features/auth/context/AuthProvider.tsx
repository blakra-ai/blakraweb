import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/shared/api/types";
import type { BuiltinSession } from "@/shared/auth/builtinSession";
import { isEmbedded } from "@/shared/auth/session";

export type AuthStatus = "loading" | "signedIn" | "signedOut" | "embedded";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  session: BuiltinSession;
}

const AuthContext = createContext<AuthState | null>(null);

/** Restores the sign-in from the session cookie once, then follows sign-in/out events.
 *  Cached data is dropped whenever the user changes, so one account never sees another's data. */
export function AuthProvider({ session, children }: { session: BuiltinSession; children: ReactNode }) {
  const client = useQueryClient();
  const embedded = isEmbedded();
  const [status, setStatus] = useState<AuthStatus>(embedded ? "embedded" : "loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (embedded) return;
    let active = true;
    const unsubscribe = session.subscribe((next) => {
      client.clear();
      setUser(next);
      setStatus(next ? "signedIn" : "signedOut");
    });
    void session.restore().then((restored) => {
      if (!active) return;
      setUser(restored);
      setStatus(restored ? "signedIn" : "signedOut");
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, embedded, session]);

  const value = useMemo(() => ({ status, user, session }), [status, user, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
