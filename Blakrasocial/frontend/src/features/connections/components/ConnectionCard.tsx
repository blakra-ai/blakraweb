import { CheckCircle2, Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Account, Platform } from "@/shared/api/types";
import { PLATFORM_META, PlatformTile } from "@/shared/platform";
import { Badge, Button, Card, ConfirmDialog } from "@/shared/ui";

interface Props {
  platform: Platform;
  account: Account | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  busy: boolean;
}

export function ConnectionCard({ platform, account, onConnect, onDisconnect, busy }: Props) {
  const { t } = useTranslation();
  const meta = PLATFORM_META[platform];
  const connectable = platform !== "whatsapp";

  return (
    <Card className="flex flex-col gap-4 p-5 transition-shadow duration-300 hover:shadow-lg animate-fade-up">
      <div className="flex items-start gap-3">
        <PlatformTile platform={platform} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{meta.name}</h3>
            {account ? (
              <Badge tone={account.needsReconnect ? "warning" : "success"}>
                {account.needsReconnect ? <RefreshCw /> : <CheckCircle2 />}
                {account.needsReconnect ? t("connections.needsReconnect") : t("connections.connected")}
              </Badge>
            ) : (
              <Badge>{t("connections.notConnected")}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(`platforms.${platform}.requirement`)}</p>
        </div>
      </div>

      {account && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          {account.avatarUrl ? (
            <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full object-cover" loading="lazy" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-card text-sm font-semibold">
              {account.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{account.displayName}</p>
            {account.username && (
              <p className="truncate text-xs text-muted-foreground" dir="ltr">
                @{account.username}
              </p>
            )}
          </div>
          {account.accountType && <Badge className="ms-auto">{account.accountType}</Badge>}
        </div>
      )}

      <div className="mt-auto flex gap-2">
        {account ? (
          <>
            {account.needsReconnect && (
              <Button variant="outline" onClick={onConnect} disabled={busy}>
                <RefreshCw /> {t("connections.reconnect")}
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-danger" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Unplug />} {t("connections.disconnect")}
                </Button>
              }
              title={t("connections.disconnectTitle", { name: meta.name })}
              description={t("connections.disconnectBody")}
              confirmLabel={t("connections.disconnect")}
              cancelLabel={t("common.cancel")}
              destructive
              onConfirm={onDisconnect}
            />
          </>
        ) : connectable ? (
          <Button onClick={onConnect} disabled={busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : <Plug />} {t("connections.connect")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">{t("platforms.whatsapp.setup")}</p>
        )}
      </div>
    </Card>
  );
}
