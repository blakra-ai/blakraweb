import { describe, expect, it } from "vitest";
import { RulesIndex } from "@/features/rules";
import type { PlatformRulesResponse } from "@/shared/api/types";
import { validateDraft, type ClientMedia } from "./clientValidator";

const rules = new RulesIndex({
  platforms: [
    {
      platform: "instagram",
      contentTypes: [
        {
          contentType: "reel",
          media: [
            {
              kind: "video", extensions: ["mov", "mp4"], maxSizeBytes: 1024 ** 3, aspectRatios: ["9:16"],
              aspectRatioRanges: [[0.5625, 0.5625]], minDurationS: 3, maxDurationS: 900, minWidth: null, minHeight: null,
            },
          ],
          minMedia: 1, maxMedia: 1, allowMixedKinds: false, maxCaptionLength: 2200, captionIgnored: false,
          maxHashtags: 5, maxMentions: 3, schedulable: true,
        },
      ],
    },
  ],
} satisfies PlatformRulesResponse);

const vertical: ClientMedia = { kind: "video", extension: "mp4", sizeBytes: 1000, width: 1080, height: 1920, durationSeconds: 20 };

describe("validateDraft", () => {
  const base = { rules, accounts: undefined, scheduled: false, targets: [{ platform: "instagram" as const, contentType: "reel" as const }] };

  it("accepts a valid reel", () => {
    expect(validateDraft({ ...base, caption: "hi", media: [vertical] })).toEqual([]);
  });

  it("flags landscape video, short duration and hashtags together", () => {
    const codes = validateDraft({
      ...base,
      caption: "#a #b #c #d #e #f",
      media: [{ ...vertical, width: 1920, height: 1080, durationSeconds: 1 }],
    }).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["aspect_ratio", "duration_too_short", "too_many_hashtags"]));
  });

  it("requires media and a known content type", () => {
    expect(validateDraft({ ...base, caption: "", media: [] }).map((i) => i.code)).toContain("media_required");
    const story = validateDraft({ ...base, targets: [{ platform: "instagram", contentType: "story" }], caption: "", media: [vertical] });
    expect(story[0]?.code).toBe("content_type_unsupported");
  });

  it("rejects WhatsApp Status explicitly", () => {
    const issues = validateDraft({ ...base, targets: [{ platform: "whatsapp", contentType: "story" }], caption: "x", media: [] });
    expect(issues[0]?.code).toBe("whatsapp_status_unsupported");
  });
});
