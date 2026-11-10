import { request } from "@/shared/api/httpClient";
import type { InviteInfo } from "@/shared/api/types";

export const authApi = {
  inspectInvite: (token: string, signal?: AbortSignal) =>
    request<InviteInfo>(`/auth/invites/${encodeURIComponent(token)}`, { anonymous: true, signal }),
};
