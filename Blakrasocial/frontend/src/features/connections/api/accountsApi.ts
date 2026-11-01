import { request } from "@/shared/api/httpClient";
import type { AccountsResponse, ConnectUrlResponse, Platform } from "@/shared/api/types";

export const accountsApi = {
  list: (signal?: AbortSignal) => request<AccountsResponse>("/accounts", { signal }),
  connectUrl: (redirectUrl?: string) =>
    request<ConnectUrlResponse>("/accounts/connect-url", { query: { redirectUrl, origin: window.location.origin } }),
  unlink: (platform: Platform) => request<void>(`/accounts/${platform}`, { method: "DELETE" }),
};
