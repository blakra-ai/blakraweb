import { Controller, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ContentType, Platform, TikTokCreatorInfo } from "@/shared/api/types";
import { LINKEDIN_VISIBILITIES } from "@/shared/api/types";
import { PLATFORM_META, PlatformTile } from "@/shared/platform";
import { Card, Input, Label, NativeSelect, Switch, Textarea } from "@/shared/ui";
import type { ComposerValues } from "../schema/composerSchema";
import { TikTokOptions } from "./TikTokOptions";
import { WhatsAppNotice } from "./WhatsAppNotice";

/** Content types that can be produced from browser uploads (documents need a separate storage adapter). */
const UPLOADABLE: ReadonlySet<ContentType> = new Set(["post", "reel", "story", "carousel", "video", "photo", "message"]);

interface Props {
  platform: Platform;
  contentTypes: ContentType[];
  control: Control<ComposerValues>;
  register: UseFormRegister<ComposerValues>;
  setValue: UseFormSetValue<ComposerValues>;
  tiktokCreator: { data?: TikTokCreatorInfo | undefined; isPending: boolean; isError: boolean };
  recipientsError?: string | undefined;
}

function ToggleRow({ control, name, label }: { control: Control<ComposerValues>; name: "instagram.shareReelsToFeed"; label: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{label}</span>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );
}

export function PlatformOptions({ platform, contentTypes, control, register, setValue, tiktokCreator, recipientsError }: Props) {
  const { t } = useTranslation();
  const contentType = useWatch({ control, name: `targets.${platform}.contentType` });
  const id = `ct-${platform}`;
  const types = contentTypes.filter((c) => UPLOADABLE.has(c));

  return (
    <Card className="space-y-4 p-4 animate-fade-up">
      <div className="flex items-center gap-3">
        <PlatformTile platform={platform} size="sm" />
        <h4 className="font-semibold">{PLATFORM_META[platform].name}</h4>
        <div className="ms-auto w-40">
          <Label htmlFor={id} className="sr-only">
            {t("composer.contentType")}
          </Label>
          <NativeSelect id={id} {...register(`targets.${platform}.contentType`)}>
            {types.map((c) => (
              <option key={c} value={c}>
                {t(`contentTypes.${c}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t(`platforms.${platform}.rules`)}</p>

      {platform === "instagram" && <ToggleRow control={control} name="instagram.shareReelsToFeed" label={t("options.shareReelsToFeed")} />}

      {platform === "facebook" && (
        <div className="space-y-1.5">
          <Label htmlFor="fb-title">{t("options.videoTitle")}</Label>
          <Input id="fb-title" maxLength={255} {...register("facebook.title")} />
        </div>
      )}

      {platform === "tiktok" && (
        <TikTokOptions contentType={contentType} control={control} register={register} setValue={setValue} creator={tiktokCreator} />
      )}

      {platform === "linkedin" && (
        <div className="space-y-1.5">
          <Label htmlFor="li-visibility">{t("options.visibility")}</Label>
          <NativeSelect id="li-visibility" {...register("linkedin.visibility")}>
            {LINKEDIN_VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {t(`options.linkedinVisibility.${v}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {platform === "whatsapp" && (
        <div className="space-y-3">
          <WhatsAppNotice />
          <div className="space-y-1.5">
            <Label htmlFor="wa-recipients">{t("options.recipients")}</Label>
            <Textarea
              id="wa-recipients"
              dir="ltr"
              className="min-h-20 font-mono text-xs"
              placeholder="+989121234567, +14155551234"
              aria-invalid={Boolean(recipientsError)}
              aria-describedby="wa-recipients-help"
              {...register("whatsappRecipients")}
            />
            <p id="wa-recipients-help" className={recipientsError ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
              {recipientsError ? t(recipientsError) : t("options.recipientsHelp")}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
