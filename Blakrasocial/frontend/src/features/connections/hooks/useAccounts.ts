import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Account, Platform } from "@/shared/api/types";
import { accountsApi } from "../api/accountsApi";

export const accountsKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery({
    queryKey: accountsKey,
    queryFn: ({ signal }) => accountsApi.list(signal),
    select: (data) => new Map<Platform, Account>(data.accounts.map((a) => [a.platform, a])),
  });
}

export function useUnlinkAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (platform: Platform) => accountsApi.unlink(platform),
    onSuccess: () => client.invalidateQueries({ queryKey: accountsKey }),
  });
}
