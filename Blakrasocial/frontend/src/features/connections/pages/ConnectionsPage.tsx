import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PLATFORMS } from "@/shared/api/types";
import { Alert, Skeleton } from "@/shared/ui";
import { usePlatformRules } from "@/features/rules";
import { ErrorState, PageHeader } from "@/app/layout/PageParts";
import { ConnectionCard } from "../components/ConnectionCard";
import { useAccounts, useUnlinkAccount } from "../hooks/useAccounts";
import { useConnectPopup } from "../hooks/useConnectPopup";

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const unlink = useUnlinkAccount();
  const popup = useConnectPopup();
  const rules = usePlatformRules();

  return (
    <div className="space-y-6">
      <PageHeader title={t("connections.title")} description={t("connections.description")} />

      {popup.error instanceof Error && popup.error.message === "popup_blocked" && (
        <Alert tone="warning" title={t("connections.popupBlocked")} />
      )}
      {popup.isOpen && <Alert title={t("connections.popupOpen")} />}

      {accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) =>
            accounts.isPending || rules.isPending ? (
              <Skeleton key={platform} className="h-48" />
            ) : (
              <ConnectionCard
                key={platform}
                platform={platform}
                account={accounts.data.get(platform)}
                connectable={rules.data?.isConnectable(platform) ?? false}
                busy={popup.openFor === platform || (unlink.isPending && unlink.variables === platform)}
                onConnect={() => void popup.open(platform)}
                onDisconnect={() =>
                  unlink.mutate(platform, {
                    onSuccess: () => toast.success(t("connections.disconnected")),
                    onError: () => toast.error(t("errors.generic")),
                  })
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
