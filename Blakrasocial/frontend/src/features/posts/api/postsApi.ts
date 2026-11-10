import { request } from "@/shared/api/httpClient";
import type { Platform, PostListResponse, PostStatus } from "@/shared/api/types";

export const postsApi = {
  list: (params: { platform?: Platform; lastDays?: number }, signal?: AbortSignal) =>
    request<PostListResponse>("/posts", { query: { limit: 50, ...params }, signal }),
  get: (id: string, signal?: AbortSignal) => request<PostStatus>(`/posts/${encodeURIComponent(id)}`, { signal }),
  remove: (id: string) => request<void>(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
