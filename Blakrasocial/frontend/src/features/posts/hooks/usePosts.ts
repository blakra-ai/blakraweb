import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Platform, PostListResponse } from "@/shared/api/types";
import { postsApi } from "../api/postsApi";

const hasPending = (data: PostListResponse | undefined) =>
  Boolean(data?.items.some((p) => p.results.some((r) => r.state === "pending")));

/** Polls only while something is still being processed (TikTok/video uploads take minutes). */
export function usePosts(filters: { platform?: Platform; lastDays: number }) {
  return useQuery({
    queryKey: ["posts", filters],
    queryFn: ({ signal }) => postsApi.list(filters, signal),
    refetchInterval: (query) => (hasPending(query.state.data) ? 15_000 : false),
  });
}

export function useDeletePost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["posts"] }),
  });
}
