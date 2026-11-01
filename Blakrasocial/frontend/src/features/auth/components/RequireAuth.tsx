import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/shared/ui";
import { useAuth } from "../context/AuthProvider";

/** Guards the app: signed-out visitors go to /login and come back to where they were afterwards. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (status === "signedOut") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/compose" replace />;
}

/** Only same-app paths are allowed after sign-in (never another site). */
export function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/compose";
}
