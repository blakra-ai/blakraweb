import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";

/** TikTok requires reading the creator's options fresh each time the post form is shown. */
export function useTikTokCreatorInfo(enabled: boolean) {
  return useQuery({
    queryKey: ["accounts", "tiktok", "creator-info"],
    queryFn: ({ signal }) => accountsApi.tiktokCreatorInfo(signal),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}
