/** TikTok's Direct Post UX rules (developers.tiktok.com/doc/content-sharing-guidelines), checked
 *  against the creator's live options. The backend re-checks audience and branded content. */
import type { ContentType, TikTokCreatorInfo } from "@/shared/api/types";
import type { ComposerValues } from "../schema/composerSchema";
import type { ClientIssue, ClientMedia } from "./clientValidator";

export function validateTikTok(input: {
  values: ComposerValues["tiktok"];
  contentType: ContentType;
  creator: TikTokCreatorInfo | undefined;
  media: ClientMedia[];
}): ClientIssue[] {
  const { values, creator } = input;
  const issues: ClientIssue[] = [];
  const err = (code: string, params?: ClientIssue["params"]) => issues.push({ platform: "tiktok", code, severity: "error", params });

  if (creator && !creator.canPost) err("tiktok_cannot_post", { reason: creator.reason ?? "" });
  if (!values.visibility) err("privacy_required", { platform: "TikTok" });
  else if (creator && creator.privacyLevels.length && !creator.privacyLevels.includes(values.visibility)) err("tiktok_privacy_unavailable");
  if (values.discloseCommercial && !values.isBrandedContent && !values.isBrandOrganic) err("tiktok_disclosure_choice");
  if (values.discloseCommercial && values.isBrandedContent && values.visibility === "private") err("branded_content_private");
  const max = creator?.maxVideoSeconds;
  if (max && input.contentType === "video") {
    input.media.forEach((m, i) => {
      if (m.kind === "video" && m.durationSeconds && m.durationSeconds > max) {
        err("duration_too_long", { index: i + 1, actual: Math.round(m.durationSeconds), max });
      }
    });
  }
  return issues;
}

/** The label TikTok will show, per its rules (both choices → "Paid partnership"). */
export function tiktokCommercialLabel(values: ComposerValues["tiktok"]): "paidPartnership" | "promotional" | null {
  if (!values.discloseCommercial) return null;
  if (values.isBrandedContent) return "paidPartnership";
  return values.isBrandOrganic ? "promotional" : null;
}
