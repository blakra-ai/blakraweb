import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ContentType, TikTokCreatorInfo } from "@/shared/api/types";
import { TIKTOK_VISIBILITIES } from "@/shared/api/types";
import { Alert, Label, NativeSelect, Switch } from "@/shared/ui";
import type { ComposerValues } from "../schema/composerSchema";
import { tiktokCommercialLabel } from "../validation/tiktokRules";

interface Props {
  contentType: ContentType;
  control: Control<ComposerValues>;
  register: UseFormRegister<ComposerValues>;
  setValue: UseFormSetValue<ComposerValues>;
  creator: { data?: TikTokCreatorInfo | undefined; isPending: boolean; isError: boolean };
}

type TikTokField = `tiktok.${keyof ComposerValues["tiktok"]}`;

function Toggle({ control, name, label, disabled, hint }: { control: Control<ComposerValues>; name: TikTokField; label: string; disabled?: boolean; hint?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center justify-between gap-3 text-sm" title={hint}>
          <span className={disabled ? "text-muted-foreground" : undefined}>
            {label}
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
          </span>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={disabled} aria-label={label} />
        </label>
      )}
    />
  );
}

/** TikTok Direct Post form, following TikTok's content sharing guidelines (required for the app audit). */
export function TikTokOptions({ contentType, control, register, setValue, creator }: Props) {
  const { t } = useTranslation();
  const values = useWatch({ control, name: "tiktok" });
  const info = creator.data;
  const offered = info?.privacyLevels.length ? TIKTOK_VISIBILITIES.filter((v) => info.privacyLevels.includes(v)) : TIKTOK_VISIBILITIES;
  const isPhoto = contentType === "photo";
  const label = tiktokCommercialLabel(values);
  const brandedBlocksPrivate = values.discloseCommercial && values.isBrandedContent;

  // Settings the creator turned off in the TikTok app can't be switched on here.
  useEffect(() => {
    if (info?.commentDisabled && values.allowComments) setValue("tiktok.allowComments", false);
    if (info?.duetDisabled && values.allowDuet) setValue("tiktok.allowDuet", false);
    if (info?.stitchDisabled && values.allowStitch) setValue("tiktok.allowStitch", false);
  }, [info, values.allowComments, values.allowDuet, values.allowStitch, setValue]);

  return (
    <div className="space-y-3">
      {creator.isPending ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> {t("tiktok.loadingCreator")}
        </p>
      ) : info ? (
        <p className="text-sm">
          {t("tiktok.postingAs")} <bdi className="font-medium">{info.nickname}</bdi>
          {info.username && (
            <bdi className="ms-1 text-muted-foreground" dir="ltr">
              @{info.username}
            </bdi>
          )}
        </p>
      ) : creator.isError ? (
        <Alert tone="warning">{t("tiktok.creatorError")}</Alert>
      ) : null}
      {info && !info.canPost && <Alert tone="danger">{info.reason ?? t("tiktok.cannotPost")}</Alert>}

      <div className="space-y-1.5">
        <Label htmlFor="tt-visibility">{t("options.privacy")}</Label>
        <NativeSelect id="tt-visibility" {...register("tiktok.visibility")}>
          <option value="" disabled>
            {t("tiktok.choosePrivacy")}
          </option>
          {offered.map((v) => {
            const blocked = v === "private" && brandedBlocksPrivate;
            return (
              <option key={v} value={v} disabled={blocked} title={blocked ? t("issues.branded_content_private") : undefined}>
                {t(`options.tiktokVisibility.${v}`)}
                {blocked ? ` (${t("tiktok.privateBlocked")})` : ""}
              </option>
            );
          })}
        </NativeSelect>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">{t("tiktok.allowUsers")}</legend>
        <Toggle control={control} name="tiktok.allowComments" label={t("tiktok.allowComments")} disabled={info?.commentDisabled} hint={info?.commentDisabled ? t("tiktok.disabledInApp") : undefined} />
        {!isPhoto && (
          <>
            <Toggle control={control} name="tiktok.allowDuet" label={t("tiktok.allowDuet")} disabled={info?.duetDisabled} hint={info?.duetDisabled ? t("tiktok.disabledInApp") : undefined} />
            <Toggle control={control} name="tiktok.allowStitch" label={t("tiktok.allowStitch")} disabled={info?.stitchDisabled} hint={info?.stitchDisabled ? t("tiktok.disabledInApp") : undefined} />
          </>
        )}
      </fieldset>

      <Toggle control={control} name="tiktok.isAiGenerated" label={t("options.aiGenerated")} />

      <fieldset className="space-y-2 rounded-xl border p-3">
        <Toggle control={control} name="tiktok.discloseCommercial" label={t("tiktok.disclose")} hint={t("tiktok.discloseHelp")} />
        {values.discloseCommercial && (
          <div className="space-y-2 ps-1">
            <Toggle control={control} name="tiktok.isBrandOrganic" label={t("tiktok.yourBrand")} hint={t("tiktok.yourBrandHelp")} />
            <Toggle control={control} name="tiktok.isBrandedContent" label={t("tiktok.brandedContent")} hint={t("tiktok.brandedContentHelp")} />
            {label ? (
              <p className="text-xs text-muted-foreground">{t(`tiktok.label.${label}`)}</p>
            ) : (
              <p className="text-xs text-danger">{t("issues.tiktok_disclosure_choice")}</p>
            )}
          </div>
        )}
      </fieldset>

      <p className="text-xs text-muted-foreground">{t("tiktok.processingNotice")}</p>
    </div>
  );
}

/** Shown right above the publish button whenever TikTok is a target (TikTok consent declaration). */
export function TikTokConsent({ control }: { control: Control<ComposerValues> }) {
  const { t } = useTranslation();
  const values = useWatch({ control, name: "tiktok" });
  const branded = values.discloseCommercial && values.isBrandedContent;
  const music = (
    <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-4 hover:underline">
      {t("tiktok.musicUsage")}
    </a>
  );
  const brandedPolicy = (
    <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-4 hover:underline">
      {t("tiktok.brandedPolicy")}
    </a>
  );
  return (
    <p className="text-xs leading-relaxed text-muted-foreground" data-testid="tiktok-consent">
      {branded ? (
        <>
          {t("tiktok.consentPrefix")} {brandedPolicy} {t("tiktok.and")} {music} {t("tiktok.consentSuffix")}
        </>
      ) : (
        <>
          {t("tiktok.consentPrefix")} {music} {t("tiktok.consentSuffix")}
        </>
      )}
    </p>
  );
}
