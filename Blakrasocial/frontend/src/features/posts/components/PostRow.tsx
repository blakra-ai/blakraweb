import { CalendarClock, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PostStatus } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/format";
import { Button, Card, ConfirmDialog } from "@/shared/ui";
import { PlatformStatusBadge } from "./PlatformStatusBadge";

export function PostRow({ post, onDelete, deleting }: { post: PostStatus; onDelete: () => void; deleting: boolean }) {
  const { t, i18n } = useTranslation();
  const thumb = post.mediaUrls[0];
  const isVideo = thumb ? /\.(mp4|mov|webm)(\?|$)/i.test(thumb) : false;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row animate-fade-up">
      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {thumb &&
          (isVideo ? (
            <video src={thumb} muted preload="metadata" className="size-full object-cover" />
          ) : (
            <img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
          ))}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm" dir="auto">{post.caption || <span className="text-muted-foreground">{t("posts.noCaption")}</span>}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {post.scheduleAt && post.state === "scheduled" && <CalendarClock className="size-3" />}
              {formatDateTime(post.scheduleAt ?? post.createdAt, i18n.language)}
            </p>
          </div>
          {post.state !== "deleted" && (
            <ConfirmDialog
              trigger={
                <Button size="icon" variant="ghost" aria-label={t("posts.delete")} disabled={deleting}>
                  <Trash2 />
                </Button>
              }
              title={post.state === "scheduled" ? t("posts.cancelTitle") : t("posts.deleteTitle")}
              description={t("posts.deleteBody")}
              confirmLabel={t("posts.delete")}
              cancelLabel={t("common.cancel")}
              destructive
              onConfirm={onDelete}
            />
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {post.results.map((result) => (
            <PlatformStatusBadge key={result.platform} result={result} />
          ))}
        </div>
      </div>
    </Card>
  );
}
