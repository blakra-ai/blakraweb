import { z } from "zod";
import type { ContentType, Platform } from "@/shared/api/types";
import { CONTENT_TYPES, LINKEDIN_VISIBILITIES, PLATFORMS, TIKTOK_VISIBILITIES } from "@/shared/api/types";

export const MIN_SCHEDULE_LEAD_MINUTES = 5;
const E164 = /^\+?[1-9]\d{6,14}$/;

const targetSchema = z.object({
  enabled: z.boolean(),
  contentType: z.enum(CONTENT_TYPES),
});

export const composerSchema = z
  .object({
    caption: z.string().max(63_206),
    targets: z.record(z.enum(PLATFORMS), targetSchema),
    instagram: z.object({ shareReelsToFeed: z.boolean() }),
    facebook: z.object({ title: z.string().max(255) }),
    // TikTok UX rules: no default audience, interactions off until the user turns them on,
    // and a commercial-content disclosure that needs at least one choice when switched on.
    tiktok: z.object({
      visibility: z.union([z.enum(TIKTOK_VISIBILITIES), z.literal("")]),
      allowComments: z.boolean(),
      allowDuet: z.boolean(),
      allowStitch: z.boolean(),
      isAiGenerated: z.boolean(),
      discloseCommercial: z.boolean(),
      isBrandedContent: z.boolean(),
      isBrandOrganic: z.boolean(),
    }),
    linkedin: z.object({
      visibility: z.enum(LINKEDIN_VISIBILITIES),
    }),
    whatsappRecipients: z.string(),
    mode: z.enum(["now", "schedule"]),
    scheduleAt: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!Object.values(value.targets).some((t) => t.enabled)) {
      ctx.addIssue({ code: "custom", path: ["targets"], message: "composer.errors.noTargets" });
    }
    if (value.mode === "schedule") {
      const when = value.scheduleAt ? new Date(value.scheduleAt) : null;
      const earliest = Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60_000;
      if (!when || Number.isNaN(when.getTime()) || when.getTime() < earliest) {
        ctx.addIssue({ code: "custom", path: ["scheduleAt"], message: "composer.errors.scheduleFuture" });
      }
    }
    if (value.targets.whatsapp?.enabled) {
      const numbers = parseRecipients(value.whatsappRecipients);
      if (!numbers.length || numbers.some((n) => !E164.test(n))) {
        ctx.addIssue({ code: "custom", path: ["whatsappRecipients"], message: "composer.errors.recipients" });
      }
    }
  });

export type ComposerValues = z.infer<typeof composerSchema>;

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((n) => n.replace(/[()-]/g, ""))
    .filter(Boolean);
}

export const DEFAULT_CONTENT_TYPE: Record<Platform, ContentType> = {
  instagram: "post",
  facebook: "post",
  tiktok: "video",
  linkedin: "post",
  whatsapp: "message",
};

export function defaultComposerValues(): ComposerValues {
  return {
    caption: "",
    targets: Object.fromEntries(
      PLATFORMS.map((p) => [p, { enabled: false, contentType: DEFAULT_CONTENT_TYPE[p] }]),
    ) as ComposerValues["targets"],
    instagram: { shareReelsToFeed: true },
    facebook: { title: "" },
    tiktok: {
      visibility: "",
      allowComments: false,
      allowDuet: false,
      allowStitch: false,
      isAiGenerated: false,
      discloseCommercial: false,
      isBrandedContent: false,
      isBrandOrganic: false,
    },
    linkedin: { visibility: "public" },
    whatsappRecipients: "",
    mode: "now",
    scheduleAt: "",
  };
}
