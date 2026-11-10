import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { InviteLinkResponse } from "@/shared/api/types";
import { Alert, Button, Input } from "@/shared/ui";

/** Shows a freshly made set-password link once, with a copy button. The link is never stored here. */
export function InviteLinkBox({ invite, onClose }: { invite: InviteLinkResponse; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const days = Math.round(invite.expiresIn / 86_400);

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
    } catch {
      (document.getElementById("invite-link") as HTMLInputElement | null)?.select();
    }
  }

  return (
    <Alert tone="success" title={t("admin.linkReady", { name: invite.user.title })}>
      <p className="mb-2">{t("admin.linkHelp", { days })}</p>
      <div className="flex gap-2">
        <Input id="invite-link" readOnly dir="ltr" value={invite.link} onFocus={(e) => e.target.select()} aria-label={t("admin.link")} />
        <Button variant="outline" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />} {copied ? t("admin.copied") : t("admin.copy")}
        </Button>
      </div>
      <Button variant="link" size="sm" className="mt-1 px-0" onClick={onClose}>
        {t("admin.done")}
      </Button>
    </Alert>
  );
}
