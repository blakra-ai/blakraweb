import { Loader2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/api/ApiError";
import type { InviteLinkResponse } from "@/shared/api/types";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, NativeSelect } from "@/shared/ui";
import { useAdminActions } from "../hooks/useAdminUsers";

export function CreateUserForm({ onCreated }: { onCreated: (invite: InviteLinkResponse) => void }) {
  const { t } = useTranslation();
  const { create } = useAdminActions();
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<"customer" | "admin">("customer");

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { email: email.trim(), title: title.trim(), role },
      {
        onSuccess: (invite) => {
          setEmail("");
          setTitle("");
          setRole("customer");
          onCreated(invite);
        },
      },
    );
  }

  const error = create.error;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.newCustomer")}</CardTitle>
        <CardDescription>{t("admin.newCustomerHelp")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="new-title">{t("admin.name")}</Label>
            <Input id="new-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">{t("auth.email")}</Label>
            <Input id="new-email" type="email" dir="ltr" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role">{t("admin.role")}</Label>
            <NativeSelect id="new-role" value={role} onChange={(e) => setRole(e.target.value as "customer" | "admin")}>
              <option value="customer">{t("admin.roles.customer")}</option>
              <option value="admin">{t("admin.roles.admin")}</option>
            </NativeSelect>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} {t("admin.create")}
          </Button>
        </form>
        {error && (
          <Alert tone="danger" className="mt-4">
            {error instanceof ApiError && error.status === 409 ? t("admin.exists") : error instanceof ApiError && error.isValidation ? t("admin.invalid") : t("errors.generic")}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
