import { CheckCircle2, Clock, ExternalLink, Loader2, Trash2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PlatformResult } from "@/shared/api/types";
import { PLATFORM_META, PlatformTile } from "@/shared/platform";
import { Badge } from "@/shared/ui";

const TONE = {
  published: { tone: "success", icon: CheckCircle2 },
  failed: { tone: "danger", icon: XCircle },
  pending: { tone: "info", icon: Loader2 },
  scheduled: { tone: "neutral", icon: Clock },
  partial: { tone: "warning", icon: XCircle },
  deleted: { tone: "neutral", icon: Trash2 },
} as const;

export function PlatformStatusBadge({ result }: { result: PlatformResult }) {
  const { t } = useTranslation();
  const { tone, icon: Icon } = TONE[result.state];
  return (
    <div className="flex items-start gap-2">
      <PlatformTile platform={result.platform} size="sm" />
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{PLATFORM_META[result.platform].name}</span>
          <Badge tone={tone}>
            <Icon className={result.state === "pending" ? "animate-spin" : undefined} />
            {t(`states.${result.state}`)}
          </Badge>
          {result.liveUrl && (
            <a
              href={result.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("posts.viewLive")} <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {result.error && <p className="text-xs text-danger" dir="auto">{result.error}</p>}
      </div>
    </div>
  );
}
