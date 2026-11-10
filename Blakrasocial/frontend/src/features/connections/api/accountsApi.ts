import { request } from "@/shared/api/httpClient";
import type { AccountsResponse, ConnectUrlResponse, Platform, TikTokCreatorInfo } from "@/shared/api/types";

export const accountsApi = {
  list: (signal?: AbortSignal) => request<AccountsResponse>("/accounts", { signal }),
  connectUrl: (platform: Platform, redirectUrl?: string) =>
    request<ConnectUrlResponse>("/accounts/connect-url", {
      query: { platform, redirectUrl, origin: window.location.origin },
    }),
  tiktokCreatorInfo: (signal?: AbortSignal) => request<TikTokCreatorInfo>("/accounts/tiktok/creator-info", { signal }),
  unlink: (platform: Platform) => request<void>(`/accounts/${platform}`, { method: "DELETE" }),
};
