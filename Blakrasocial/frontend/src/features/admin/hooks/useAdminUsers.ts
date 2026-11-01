import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type NewUser, type WhatsAppNumber } from "../api/adminApi";

const usersKey = ["admin", "users"] as const;

export function useAdminUsers() {
  return useQuery({ queryKey: usersKey, queryFn: ({ signal }) => adminApi.users(signal), staleTime: 0 });
}

export function useAdminActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: usersKey });
  return {
    create: useMutation({ mutationFn: (body: NewUser) => adminApi.create(body), onSuccess: refresh }),
    newLink: useMutation({ mutationFn: (id: string) => adminApi.newLink(id) }),
    setDisabled: useMutation({
      mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => adminApi.setDisabled(id, disabled),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => adminApi.remove(id), onSuccess: refresh }),
    setWhatsApp: useMutation({ mutationFn: ({ id, body }: { id: string; body: WhatsAppNumber }) => adminApi.setWhatsApp(id, body) }),
  };
}
