import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatDuration, ratioLabel } from "@/shared/lib/format";
import { Button, Progress } from "@/shared/ui";
import type { UploadItem } from "../types";

interface Props {
  items: UploadItem[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}

export function MediaList({ items, onRemove, onRetry, onMove }: Props) {
  const { t, i18n } = useTranslation();
  if (!items.length) return null;

  return (
    <ul className="space-y-2" aria-label={t("media.listLabel")}>
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 animate-fade-up">
          <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.file.type.startsWith("video/") ? (
              <video src={item.previewUrl} muted className="size-full object-cover" />
            ) : (
              <img src={item.previewUrl} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium" dir="auto">{item.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {/* <bdi> isolates each mixed-direction value (e.g. "۳٫۸ MB") so RTL layout can't reorder its parts. */}
              {[
                formatBytes(item.file.size, i18n.language),
                item.probe && ratioLabel(item.probe.width, item.probe.height),
                item.probe && `${item.probe.width}×${item.probe.height}`,
                item.probe?.durationSeconds != null && formatDuration(item.probe.durationSeconds, i18n.language),
              ]
                .filter(Boolean)
                .map((part, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    <bdi>{part}</bdi>
                  </span>
                ))}
            </p>
            {item.status === "uploading" && <Progress value={item.progress} label={t("media.uploading")} />}
            {item.status === "error" && (
              <p className="flex items-center gap-1 text-xs text-danger">
                <AlertCircle className="size-3" /> {t("media.failed")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {item.status === "done" && <CheckCircle2 className="size-5 text-success" aria-label={t("media.uploaded")} />}
            {item.status === "error" && (
              <Button size="icon" variant="ghost" onClick={() => onRetry(item.id)} aria-label={t("common.retry")}>
                <RotateCcw />
              </Button>
            )}
            <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => onMove(item.id, -1)} aria-label={t("media.moveUp")}>
              <ArrowUp />
            </Button>
            <Button size="icon" variant="ghost" disabled={index === items.length - 1} onClick={() => onMove(item.id, 1)} aria-label={t("media.moveDown")}>
              <ArrowDown />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)} aria-label={t("common.remove")}>
              <X />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
