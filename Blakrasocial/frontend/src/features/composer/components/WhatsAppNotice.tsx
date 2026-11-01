import { useTranslation } from "react-i18next";
import { Alert } from "@/shared/ui";

export function WhatsAppNotice() {
  const { t } = useTranslation();
  return (
    <Alert tone="warning" title={t("platforms.whatsapp.noticeTitle")}>
      <ul className="list-disc space-y-1 ps-4">
        <li>{t("platforms.whatsapp.noStatus")}</li>
        <li>{t("platforms.whatsapp.window")}</li>
        <li>{t("platforms.whatsapp.noSchedule")}</li>
      </ul>
    </Alert>
  );
}
