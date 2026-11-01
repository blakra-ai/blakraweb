/** Mirrors the backend's validation strategies using the specs it publishes, for instant
 *  feedback while composing. The backend re-validates with server-measured media. */
import type { RulesIndex } from "@/features/rules";
import type { Account, ContentType, MediaKind, Platform } from "@/shared/api/types";

export interface ClientMedia {
  kind: MediaKind;
  extension: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number | null;
}

export interface ClientIssue {
  platform: Platform | null;
  code: string;
  severity: "error" | "warning";
  params?: Record<string, string | number>;
}

export interface ClientTarget {
  platform: Platform;
  contentType: ContentType;
}

const HASHTAG = /(?<!\w)#\w+/gu;
const MENTION = /(?<!\w)@[\w.]+/gu;
const TOLERANCE = 0.02;

export function validateDraft(input: {
  rules: RulesIndex;
  targets: ClientTarget[];
  caption: string;
  media: ClientMedia[];
  accounts: Map<Platform, Account> | undefined;
  scheduled: boolean;
}): ClientIssue[] {
  const issues: ClientIssue[] = [];
  const { rules, caption, media } = input;

  for (const { platform, contentType } of input.targets) {
    const err = (code: string, params?: ClientIssue["params"]) => issues.push({ platform, code, severity: "error", params });
    const warn = (code: string, params?: ClientIssue["params"]) => issues.push({ platform, code, severity: "warning", params });

    if (platform === "whatsapp" && contentType === "story") {
      err("whatsapp_status_unsupported");
      continue;
    }
    const spec = rules.spec(platform, contentType);
    if (!spec) {
      err("content_type_unsupported", { contentType });
      continue;
    }
    if (input.accounts && platform !== "whatsapp" && !input.accounts.has(platform)) err("account_not_connected");
    if (input.scheduled && !spec.schedulable) err("schedule_unsupported");

    const text = caption.trim();
    if (spec.captionIgnored && text) warn("caption_ignored", { contentType });
    if (!spec.captionIgnored) {
      if (spec.maxCaptionLength != null && caption.length > spec.maxCaptionLength)
        err("caption_too_long", { actual: caption.length, max: spec.maxCaptionLength });
      const tags = caption.match(HASHTAG)?.length ?? 0;
      if (spec.maxHashtags != null && tags > spec.maxHashtags) err("too_many_hashtags", { actual: tags, max: spec.maxHashtags });
      const mentions = caption.match(MENTION)?.length ?? 0;
      if (spec.maxMentions != null && mentions > spec.maxMentions) err("too_many_mentions", { actual: mentions, max: spec.maxMentions });
    }
    if ((platform === "linkedin" || platform === "whatsapp") && !text && !media.length) err("caption_required", { contentType });

    if (spec.minMedia > 0 && !media.length) {
      err("media_required", { contentType });
      continue;
    }
    if (media.length && (media.length < spec.minMedia || media.length > spec.maxMedia))
      err("media_count", { min: spec.minMedia, max: spec.maxMedia, actual: media.length });
    if (new Set(media.map((m) => m.kind)).size > 1 && !spec.allowMixedKinds) err("media_mixed_kinds", { contentType });

    media.forEach((item, index) => {
      const c = spec.media.find((m) => m.kind === item.kind);
      const at = { index: index + 1 };
      if (!c) return err("media_kind", { ...at, kind: item.kind });
      if (item.extension && !c.extensions.includes(item.extension))
        err("media_format", { ...at, actual: item.extension, allowed: c.extensions.join(", ") });
      if (item.sizeBytes > c.maxSizeBytes)
        err("file_too_large", { ...at, actualMb: mb(item.sizeBytes), maxMb: mb(c.maxSizeBytes) });
      if (item.durationSeconds != null) {
        const d = Math.round(item.durationSeconds * 10) / 10;
        if (c.minDurationS != null && d < c.minDurationS) err("duration_too_short", { ...at, actual: d, min: c.minDurationS });
        if (c.maxDurationS != null && d > c.maxDurationS) err("duration_too_long", { ...at, actual: d, max: c.maxDurationS });
      }
      if (item.width && item.height) {
        const ratio = item.width / item.height;
        if (c.aspectRatioRanges.length && !c.aspectRatioRanges.some(([lo, hi]) => ratio >= lo * (1 - TOLERANCE) && ratio <= hi * (1 + TOLERANCE)))
          err("aspect_ratio", { ...at, expected: c.aspectRatios.join(" / "), actual: `${item.width}×${item.height}` });
        if (c.minWidth != null && c.minHeight != null && (item.width < c.minWidth || item.height < c.minHeight))
          err("resolution_too_low", { ...at, actual: `${item.width}×${item.height}`, min: `${c.minWidth}×${c.minHeight}` });
      }
    });
  }
  return issues;
}

function mb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}
