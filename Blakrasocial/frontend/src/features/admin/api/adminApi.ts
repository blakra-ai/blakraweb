import { request } from "@/shared/api/httpClient";
import type { AdminUser, AdminUsersResponse, InviteLinkResponse } from "@/shared/api/types";

export type NewUser = { email: string; title: string; role: "customer" | "admin" };
export type WhatsAppNumber = { phoneNumberId: string; accessToken: string; displayName: string; phoneDisplay?: string };

export const adminApi = {
  users: (signal?: AbortSignal) => request<AdminUsersResponse>("/admin/users", { signal }),
  create: (body: NewUser) => request<InviteLinkResponse>("/admin/users", { method: "POST", body }),
  newLink: (id: string) => request<InviteLinkResponse>(`/admin/users/${encodeURIComponent(id)}/link`, { method: "POST" }),
  setDisabled: (id: string, disabled: boolean) =>
    request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/${disabled ? "disable" : "enable"}`, { method: "POST" }),
  remove: (id: string) => request<void>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  setWhatsApp: (id: string, body: WhatsAppNumber) =>
    request<void>(`/admin/users/${encodeURIComponent(id)}/whatsapp`, { method: "PUT", body }),
};
