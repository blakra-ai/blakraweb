import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAdmin, RequireAuth } from "@/features/auth";
import { Skeleton } from "@/shared/ui";
import { AppShell } from "./layout/AppShell";

// Each page is its own chunk: the first screen loads only what it needs.
const ComposerPage = lazy(() => import("@/features/composer").then((m) => ({ default: m.ComposerPage })));
const ConnectionsPage = lazy(() => import("@/features/connections").then((m) => ({ default: m.ConnectionsPage })));
const PostsPage = lazy(() => import("@/features/posts").then((m) => ({ default: m.PostsPage })));
const LoginPage = lazy(() => import("@/features/auth/pages").then((m) => ({ default: m.LoginPage })));
const InvitePage = lazy(() => import("@/features/auth/pages").then((m) => ({ default: m.InvitePage })));
const AccountPage = lazy(() => import("@/features/auth/pages").then((m) => ({ default: m.AccountPage })));
const CustomersPage = lazy(() => import("@/features/admin").then((m) => ({ default: m.CustomersPage })));
const LegalPage = lazy(() => import("@/features/legal").then((m) => ({ default: m.LegalPage })));

const page = (node: ReactNode) => <Suspense fallback={<Skeleton className="h-96" />}>{node}</Suspense>;

export const router = createBrowserRouter([
  // Public: sign-in, set-password links and the legal pages networks link to from their app review.
  { path: "login", element: page(<LoginPage />) },
  { path: "invite", element: page(<InvitePage />) },
  { path: "privacy", element: page(<LegalPage doc="privacy" />) },
  { path: "terms", element: page(<LegalPage doc="terms" />) },
  { path: "data-deletion", element: page(<LegalPage doc="deletion" />) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/compose" replace /> },
          { path: "compose", element: page(<ComposerPage />) },
          { path: "connections", element: page(<ConnectionsPage />) },
          { path: "posts", element: page(<PostsPage />) },
          { path: "account", element: page(<AccountPage />) },
          { element: <RequireAdmin />, children: [{ path: "admin", element: page(<CustomersPage />) }] },
          { path: "*", element: <Navigate to="/compose" replace /> },
        ],
      },
    ],
  },
]);
