import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth";
import { ApiError } from "@/shared/api/ApiError";
import { builtinSession } from "@/shared/auth/builtinSession";
import { router } from "./router";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Never retry auth/validation errors; retry transient failures twice.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

export function App() {
  const [client] = useState(createQueryClient);
  const { i18n } = useTranslation();
  return (
    <QueryClientProvider client={client}>
      <AuthProvider session={builtinSession}>
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster richColors closeButton position="bottom-center" dir={i18n.dir()} />
    </QueryClientProvider>
  );
}
