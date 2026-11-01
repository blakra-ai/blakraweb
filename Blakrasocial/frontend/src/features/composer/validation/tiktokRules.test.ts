import { describe, expect, it } from "vitest";
import type { TikTokCreatorInfo } from "@/shared/api/types";
import { buildPublishRequest } from "../buildRequest";
import { defaultComposerValues, type ComposerValues } from "../schema/composerSchema";
import { tiktokCommercialLabel, validateTikTok } from "./tiktokRules";

const creator: TikTokCreatorInfo = {
  nickname: "Blakra",
  username: "blakra",
  avatarUrl: null,
  privacyLevels: ["public", "followers", "private"],
  commentDisabled: false,
  duetDisabled: true,
  stitchDisabled: false,
  maxVideoSeconds: 60,
  canPost: true,
  reason: null,
};
const tiktok = (patch: Partial<ComposerValues["tiktok"]>) => ({ ...defaultComposerValues().tiktok, ...patch });
const codes = (values: ComposerValues["tiktok"], info: TikTokCreatorInfo | undefined = creator, duration = 30) =>
  validateTikTok({ values, contentType: "video", creator: info, media: [{ kind: "video", extension: "mp4", sizeBytes: 1, durationSeconds: duration }] }).map((i) => i.code);

describe("TikTok Direct Post rules", () => {
  it("has no default audience and no interactions switched on", () => {
    const d = defaultComposerValues().tiktok;
    expect(d.visibility).toBe("");
    expect([d.allowComments, d.allowDuet, d.allowStitch, d.discloseCommercial]).toEqual([false, false, false, false]);
    expect(codes(d)).toContain("privacy_required");
  });

  it("accepts a complete choice", () => {
    expect(codes(tiktok({ visibility: "public" }))).toEqual([]);
  });

  it("only allows audiences TikTok offers this creator", () => {
    expect(codes(tiktok({ visibility: "friends" }))).toContain("tiktok_privacy_unavailable");
  });

  it("requires a choice when commercial disclosure is on, and blocks private branded content", () => {
    expect(codes(tiktok({ visibility: "public", discloseCommercial: true }))).toContain("tiktok_disclosure_choice");
    expect(codes(tiktok({ visibility: "private", discloseCommercial: true, isBrandedContent: true }))).toContain("branded_content_private");
    expect(tiktokCommercialLabel(tiktok({ discloseCommercial: true, isBrandOrganic: true }))).toBe("promotional");
    expect(tiktokCommercialLabel(tiktok({ discloseCommercial: true, isBrandOrganic: true, isBrandedContent: true }))).toBe("paidPartnership");
  });

  it("checks the creator's max video length and posting ability", () => {
    expect(codes(tiktok({ visibility: "public" }), creator, 90)).toContain("duration_too_long");
    expect(codes(tiktok({ visibility: "public" }), { ...creator, canPost: false, reason: "limit" })).toContain("tiktok_cannot_post");
  });

  it("maps 'allow' switches to the API's disable flags and drops undisclosed brand flags", () => {
    const values = defaultComposerValues();
    values.targets.tiktok = { enabled: true, contentType: "video" };
    values.tiktok = tiktok({ visibility: "followers", allowComments: true, isBrandedContent: true });
    const [target] = buildPublishRequest(values, []).targets;
    expect(target!.options).toMatchObject({
      visibility: "followers",
      disableComments: false,
      disableDuet: true,
      disableStitch: true,
      isBrandedContent: false,
      isBrandOrganic: false,
    });
  });
});
