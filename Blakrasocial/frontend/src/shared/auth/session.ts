/** How the app gets credentials. By default the built-in sign-in (see builtinSession.ts).
 *
 *  A platform that embeds this app can instead call `configureSession()` once with a provider that
 *  returns a fresh, short-lived access token it issued. The customer's profile key is read from the
 *  token's claims, so it always matches what the backend verifies. */
export interface SessionProvider {
  getAccessToken(): Promise<string>;
  getProfileKey(token: string): string;
  /** Called when the backend rejects the token (revoked, account disabled, signed out elsewhere). */
  onUnauthorized?(): void;
}

const PROFILE_CLAIM = import.meta.env.VITE_PROFILE_KEY_CLAIM || "profile_key";

export function profileKeyFromToken(token: string, claim: string = PROFILE_CLAIM): string {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Malformed access token");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const value = (JSON.parse(json) as Record<string, unknown>)[claim];
  if (typeof value !== "string" || !value) throw new Error(`Access token has no '${claim}' claim`);
  return value;
}

export class CallbackSessionProvider implements SessionProvider {
  constructor(private readonly fetchToken: () => Promise<string>) {}

  getAccessToken(): Promise<string> {
    return this.fetchToken();
  }

  getProfileKey(token: string): string {
    return profileKeyFromToken(token);
  }
}

let current: SessionProvider | null = null;

export function configureSession(provider: SessionProvider): void {
  current = provider;
}

/** True when a host platform supplies tokens (no built-in sign-in screens). */
export function isEmbedded(): boolean {
  return current !== null;
}

export function getSession(): SessionProvider {
  if (current) return current;
  if (!builtinRef) throw new Error("No session configured.");
  return builtinRef;
}

let builtinRef: SessionProvider | null = null;

/** Registered once at startup (main.tsx); kept out of this module so it stays free of fetch logic. */
export function registerBuiltin(provider: SessionProvider): void {
  builtinRef = provider;
}
