import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Skeleton } from "@/shared/ui";
import { AppShell } from "./layout/AppShell";

// Each page is its own chunk: the first screen loads only what it needs.
const ComposerPage = lazy(() => import("@/features/composer").then((m) => ({ default: m.ComposerPage })));
const ConnectionsPage = lazy(() => import("@/features/connections").then((m) => ({ default: m.ConnectionsPage })));
const PostsPage = lazy(() => import("@/features/posts").then((m) => ({ default: m.PostsPage })));

const page = (node: ReactNode) => <Suspense fallback={<Skeleton className="h-96" />}>{node}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/compose" replace /> },
      { path: "compose", element: page(<ComposerPage />) },
      { path: "connections", element: page(<ConnectionsPage />) },
      { path: "posts", element: page(<PostsPage />) },
      { path: "*", element: <Navigate to="/compose" replace /> },
    ],
  },
]);
