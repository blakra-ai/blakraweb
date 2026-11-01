import { KeyRound, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ErrorState, PageHeader } from "@/app/layout/PageParts";
import { useAuth } from "@/features/auth";
import type { AdminUser, InviteLinkResponse } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/format";
import { Badge, Button, Card, ConfirmDialog, Skeleton } from "@/shared/ui";
import { CreateUserForm } from "../components/CreateUserForm";
import { InviteLinkBox } from "../components/InviteLinkBox";
import { WhatsAppDialog } from "../components/WhatsAppDialog";
import { useAdminActions, useAdminUsers } from "../hooks/useAdminUsers";

function UserRow({ user, self, onLink }: { user: AdminUser; self: boolean; onLink: (invite: InviteLinkResponse) => void }) {
  const { t, i18n } = useTranslation();
  const { newLink, setDisabled } = useAdminActions();
  const status = user.disabled ? "disabled" : user.passwordSet ? "active" : "invited";
  const tone = { active: "success", invited: "warning", disabled: "danger" } as const;

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          <bdi>{user.title}</bdi>
          <Badge tone={tone[status]}>{t(`admin.status.${status}`)}</Badge>
          {user.role === "admin" && <Badge>{t("admin.roles.admin")}</Badge>}
        </p>
        <p className="truncate text-sm text-muted-foreground" dir="ltr">
          {user.email}
        </p>
        <p className="text-xs text-muted-foreground">
          {user.lastLoginAt ? t("admin.lastLogin", { when: formatDateTime(user.lastLoginAt, i18n.language) }) : t("admin.neverSignedIn")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        <WhatsAppDialog user={user} />
        <Button
          size="sm"
          variant="ghost"
          disabled={newLink.isPending}
          onClick={() => newLink.mutate(user.id, { onSuccess: onLink, onError: () => toast.error(t("errors.generic")) })}
        >
          <KeyRound /> {user.passwordSet ? t("admin.resetLink") : t("admin.newLink")}
        </Button>
        {!self &&
          (user.disabled ? (
            <Button size="sm" variant="ghost" onClick={() => setDisabled.mutate({ id: user.id, disabled: false })}>
              <LockOpen /> {t("admin.enable")}
            </Button>
          ) : (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" className="text-danger">
                  <Lock /> {t("admin.disable")}
                </Button>
              }
              title={t("admin.disableTitle", { name: user.title })}
              description={t("admin.disableHelp")}
              confirmLabel={t("admin.disable")}
              cancelLabel={t("common.cancel")}
              destructive
              onConfirm={() => setDisabled.mutate({ id: user.id, disabled: true })}
            />
          ))}
      </div>
    </li>
  );
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const users = useAdminUsers();
  const [invite, setInvite] = useState<InviteLinkResponse | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.title")} description={t("admin.description")} />
      <CreateUserForm onCreated={setInvite} />
      {invite && <InviteLinkBox invite={invite} onClose={() => setInvite(null)} />}
      {users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : users.isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {users.data.users.map((u) => (
              <UserRow key={u.id} user={u} self={u.id === me?.id} onLink={setInvite} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
