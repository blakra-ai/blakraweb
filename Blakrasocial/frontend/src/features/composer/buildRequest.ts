import type { UploadItem } from "@/features/media";
import type { Platform, PublishPostRequest, TargetRequest } from "@/shared/api/types";
import { PLATFORMS } from "@/shared/api/types";
import { parseRecipients, type ComposerValues } from "./schema/composerSchema";

export function enabledPlatforms(values: ComposerValues): Platform[] {
  return PLATFORMS.filter((p) => values.targets[p]?.enabled);
}

/** Maps form state to the API contract. Only uploaded files (with signed tokens) are sent. */
export function buildPublishRequest(values: ComposerValues, media: UploadItem[]): PublishPostRequest {
  const targets: TargetRequest[] = enabledPlatforms(values).map((platform) => {
    const contentType = values.targets[platform]!.contentType;
    switch (platform) {
      case "instagram":
        return { platform, contentType, options: { shareReelsToFeed: values.instagram.shareReelsToFeed } };
      case "facebook":
        return { platform, contentType, options: { title: values.facebook.title.trim() || null } };
      case "tiktok":
        return { platform, contentType, options: tiktokOptions(values.tiktok) };
      case "linkedin":
        return { platform, contentType, options: { visibility: values.linkedin.visibility } };
      case "whatsapp":
        return { platform, contentType, options: { recipients: parseRecipients(values.whatsappRecipients) } };
    }
  });

  return {
    caption: values.caption,
    media: media.filter((m) => m.accessUrl && m.mediaToken).map((m) => ({ url: m.accessUrl!, token: m.mediaToken! })),
    targets,
    scheduleAt: values.mode === "schedule" && values.scheduleAt ? new Date(values.scheduleAt).toISOString() : null,
  };
}

function tiktokOptions(v: ComposerValues["tiktok"]) {
  return {
    visibility: v.visibility || null,
    disableComments: !v.allowComments,
    disableDuet: !v.allowDuet,
    disableStitch: !v.allowStitch,
    isAiGenerated: v.isAiGenerated,
    isBrandedContent: v.discloseCommercial && v.isBrandedContent,
    isBrandOrganic: v.discloseCommercial && v.isBrandOrganic,
  };
}
