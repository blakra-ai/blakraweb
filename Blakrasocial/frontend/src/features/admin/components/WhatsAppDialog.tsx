import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ApiError } from "@/shared/api/ApiError";
import type { AdminUser } from "@/shared/api/types";
import { Alert, Button, Input, Label } from "@/shared/ui";
import { useAdminActions } from "../hooks/useAdminUsers";

/** Attaches a WhatsApp Business (Cloud API) number to a customer. The token is sent once and stored
 *  encrypted on the server; it is never shown again. */
export function WhatsAppDialog({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const { setWhatsApp } = useAdminActions();
  const [open, setOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayName, setDisplayName] = useState(user.title);
  const [phoneDisplay, setPhoneDisplay] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setWhatsApp.mutate(
      { id: user.id, body: { phoneNumberId: phoneNumberId.trim(), accessToken: accessToken.trim(), displayName: displayName.trim(), phoneDisplay: phoneDisplay.trim() || undefined } },
      {
        onSuccess: () => {
          setAccessToken("");
          setOpen(false);
          toast.success(t("admin.whatsappSaved"));
        },
      },
    );
  }

  const error = setWhatsApp.error;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button size="sm" variant="ghost">
          <MessageCircle /> WhatsApp
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-card">
          <DialogPrimitive.Title className="text-lg font-semibold">{t("admin.whatsappTitle", { name: user.title })}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">{t("admin.whatsappHelp")}</DialogPrimitive.Description>
          <form className="mt-4 space-y-4" onSubmit={submit}>
            {error && <Alert tone="danger">{error instanceof ApiError && error.status < 500 ? error.message : t("errors.generic")}</Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="wa-id">{t("admin.whatsappPhoneId")}</Label>
              <Input id="wa-id" dir="ltr" required inputMode="numeric" pattern="[0-9]{5,32}" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-token">{t("admin.whatsappToken")}</Label>
              <Input id="wa-token" type="password" autoComplete="off" dir="ltr" required value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-name">{t("admin.whatsappName")}</Label>
              <Input id="wa-name" required maxLength={120} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone">{t("admin.whatsappPhone")}</Label>
              <Input id="wa-phone" dir="ltr" maxLength={32} placeholder="+1 555 0100" value={phoneDisplay} onChange={(e) => setPhoneDisplay(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <DialogPrimitive.Close asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </DialogPrimitive.Close>
              <Button type="submit" disabled={setWhatsApp.isPending}>
                {setWhatsApp.isPending && <Loader2 className="animate-spin" />} {t("admin.save")}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
