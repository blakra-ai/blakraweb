import { Heart, MessageCircle, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UploadItem } from "@/features/media";
import type { Account, ContentType, Platform } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";
import { PLATFORM_META, PlatformTile } from "@/shared/platform";

interface Props {
  platform: Platform;
  contentType: ContentType;
  caption: string;
  media: UploadItem[];
  account: Account | undefined;
}

const VERTICAL: ReadonlySet<ContentType> = new Set(["reel", "story", "video", "photo"]);

/** A lightweight look-alike frame per network so customers see crop and layout before publishing. */
export function PreviewFrame({ platform, contentType, caption, media, account }: Props) {
  const { t } = useTranslation();
  const ratio = PLATFORM_META[platform].previewRatio[contentType] ?? 1;
  const first = media[0];
  const isVertical = VERTICAL.has(contentType) && platform !== "linkedin";
  const name = account?.displayName ?? PLATFORM_META[platform].name;

  const visual = (
    <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: ratio }}>
      {first ? (
        first.file.type.startsWith("video/") ? (
          <video src={first.previewUrl} muted loop autoPlay playsInline className="size-full object-cover" />
        ) : (
          <img src={first.previewUrl} alt={t("preview.mediaAlt")} className="size-full object-cover" />
        )
      ) : (
        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">{t("preview.noMedia")}</div>
      )}
      {media.length > 1 && (
        <span className="absolute end-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">1/{media.length}</span>
      )}
      {isVertical && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <PlatformTile platform={platform} size="sm" /> {name}
          </div>
          {contentType !== "story" && caption && <p className="mt-1 line-clamp-2 text-xs" dir="auto">{caption}</p>}
        </div>
      )}
    </div>
  );

  if (platform === "whatsapp") {
    return (
      <div className="rounded-2xl bg-[#e5ddd5] p-3 dark:bg-[#0b141a]">
        <div className="ms-auto max-w-[85%] space-y-1 rounded-xl rounded-se-none bg-[#d9fdd3] p-1.5 shadow dark:bg-[#005c4b]">
          {first && <div className="overflow-hidden rounded-lg">{visual}</div>}
          {caption && <p className="whitespace-pre-wrap px-1.5 pb-1 text-sm text-black dark:text-white" dir="auto">{caption}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-card", isVertical ? "max-w-[260px]" : "max-w-sm")}>
      {!isVertical && (
        <div className="flex items-center gap-2 p-3">
          {account?.avatarUrl ? (
            <img src={account.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
          ) : (
            <PlatformTile platform={platform} size="sm" />
          )}
          <span className="text-sm font-semibold">{name}</span>
        </div>
      )}
      {platform === "linkedin" && caption && <p className="line-clamp-4 px-3 pb-2 text-sm" dir="auto">{caption}</p>}
      {visual}
      {!isVertical && platform !== "linkedin" && (
        <div className="space-y-1 p-3">
          <div className="flex gap-3 text-muted-foreground" aria-hidden>
            <Heart className="size-5" /> <MessageCircle className="size-5" /> <Send className="size-5" />
          </div>
          {caption && (
            <p className="line-clamp-3 text-sm" dir="auto">
              <strong className="me-1">{name}</strong>
              {caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
