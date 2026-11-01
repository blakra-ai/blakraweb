import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAccounts, useTikTokCreatorInfo } from "@/features/connections";
import { MediaDropzone, MediaList, useMediaUpload } from "@/features/media";
import { usePlatformRules } from "@/features/rules";
import { ApiError } from "@/shared/api/ApiError";
import type { Platform } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";
import { PLATFORM_META } from "@/shared/platform";
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Skeleton, Textarea } from "@/shared/ui";
import { ErrorState, PageHeader } from "@/app/layout/PageParts";
import { buildPublishRequest, enabledPlatforms } from "../buildRequest";
import { PlatformOptions } from "../components/PlatformOptions";
import { TikTokConsent } from "../components/TikTokOptions";
import { PreviewFrame } from "../components/preview/PreviewFrame";
import { ScheduleField } from "../components/ScheduleField";
import { TargetPicker } from "../components/TargetPicker";
import { ValidationPanel } from "../components/ValidationPanel";
import { usePublishPost } from "../hooks/usePublishPost";
import { composerSchema, defaultComposerValues, type ComposerValues } from "../schema/composerSchema";
import { validateDraft, type ClientIssue, type ClientMedia } from "../validation/clientValidator";
import { validateTikTok } from "../validation/tiktokRules";

/** The networks may still be processing the post ("pending"); say so instead of claiming it is live. */
const SUCCESS_MESSAGE: Partial<Record<string, string>> = {
  scheduled: "composer.scheduled",
  pending: "composer.sending",
};

export default function ComposerPage() {
  const { t } = useTranslation();
  const rules = usePlatformRules();
  const accounts = useAccounts();
  const uploads = useMediaUpload();
  const publish = usePublishPost();
  // Server-side issues stay visible only while the draft they refer to is unchanged.
  const [serverIssues, setServerIssues] = useState<{ draft: string; issues: ClientIssue[] }>({ draft: "", issues: [] });
  const [previewPlatform, setPreviewPlatform] = useState<Platform | null>(null);

  const form = useForm<ComposerValues>({ resolver: zodResolver(composerSchema), defaultValues: defaultComposerValues(), mode: "onChange" });
  const values = useWatch({ control: form.control }) as ComposerValues;
  const selected = enabledPlatforms(values);
  const tiktokSelected = selected.includes("tiktok");
  const tiktokCreator = useTikTokCreatorInfo(tiktokSelected && Boolean(accounts.data?.has("tiktok")));
  const activePreview = previewPlatform && selected.includes(previewPlatform) ? previewPlatform : selected[0];

  // Keep the chosen content type valid for each platform once rules load.
  useEffect(() => {
    if (!rules.data) return;
    for (const platform of Object.keys(values.targets) as Platform[]) {
      const allowed = rules.data.contentTypes(platform);
      if (allowed.length && !allowed.includes(values.targets[platform]!.contentType)) {
        form.setValue(`targets.${platform}.contentType`, allowed[0]!);
      }
    }
  }, [rules.data, values.targets, form]);

  const media = useMemo<ClientMedia[]>(
    () =>
      uploads.items.map((item) => ({
        kind: item.file.type.startsWith("video/") ? "video" : "image",
        extension: item.file.name.split(".").pop()?.toLowerCase() ?? "",
        sizeBytes: item.file.size,
        width: item.probe?.width,
        height: item.probe?.height,
        durationSeconds: item.probe?.durationSeconds,
      })),
    [uploads.items],
  );

  const clientIssues = useMemo(
    () => [
      ...(rules.data
        ? validateDraft({
            rules: rules.data,
            targets: selected.map((platform) => ({ platform, contentType: values.targets[platform]!.contentType })),
            caption: values.caption,
            media,
            accounts: accounts.data,
            scheduled: values.mode === "schedule",
          })
        : []),
      ...(tiktokSelected
        ? validateTikTok({ values: values.tiktok, contentType: values.targets.tiktok!.contentType, creator: tiktokCreator.data, media })
        : []),
    ],
    [rules.data, selected, values, media, accounts.data, tiktokSelected, tiktokCreator.data],
  );
  const draft = JSON.stringify(buildPublishRequest(values, uploads.items));
  const issues = [...clientIssues, ...(serverIssues.draft === draft ? serverIssues.issues : [])];
  const hasErrors = issues.some((i) => i.severity === "error");
  const uploadsFailed = uploads.items.some((i) => i.status === "error");

  const onSubmit = form.handleSubmit((data) => {
    publish.mutate(buildPublishRequest(data, uploads.items), {
      onSuccess: (result) => {
        const failed = result.results.filter((r) => r.state === "failed");
        if (failed.length) toast.warning(t("composer.partial", { count: failed.length }));
        else toast.success(t(SUCCESS_MESSAGE[result.state] ?? "composer.published"));
        form.reset(defaultComposerValues());
        uploads.reset();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.issues.length) {
          setServerIssues({
            draft,
            issues: error.issues.map((i) => ({
              platform: (i.platform as Platform | null) ?? null,
              code: i.code,
              severity: i.severity === "warning" ? "warning" : "error",
              params: Object.fromEntries(Object.entries(i.params ?? {}).map(([k, v]) => [k, String(v)])),
            })),
          });
        }
        toast.error(error instanceof ApiError ? error.message : t("errors.generic"));
      },
    });
  });

  if (rules.isError) return <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <PageHeader title={t("composer.title")} description={t("composer.description")} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("composer.content")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaDropzone onFiles={uploads.add} remaining={35 - uploads.items.length} />
              <MediaList items={uploads.items} onRemove={uploads.remove} onRetry={uploads.retry} onMove={uploads.move} />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="caption">{t("composer.caption")}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{values.caption.length}</span>
                </div>
                <Textarea id="caption" dir="auto" placeholder={t("composer.captionPlaceholder")} {...form.register("caption")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("composer.where")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TargetPicker
                selected={selected}
                accounts={accounts.data}
                onToggle={(p) => form.setValue(`targets.${p}.enabled`, !values.targets[p]!.enabled, { shouldValidate: true })}
              />
              {accounts.data && selected.some((p) => p !== "whatsapp" && !accounts.data.has(p)) && (
                <p className="text-xs text-muted-foreground">
                  {t("composer.connectFirst")}{" "}
                  <Link to="/connections" className="text-primary underline-offset-4 hover:underline">
                    {t("nav.connections")}
                  </Link>
                </p>
              )}
              {rules.isPending ? (
                <Skeleton className="h-24" />
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {selected.map((platform) => (
                    <PlatformOptions
                      key={platform}
                      platform={platform}
                      contentTypes={rules.data.contentTypes(platform)}
                      control={form.control}
                      register={form.register}
                      setValue={form.setValue}
                      tiktokCreator={tiktokCreator}
                      recipientsError={form.formState.errors.whatsappRecipients?.message}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t("composer.preview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.length > 1 && (
                <div role="tablist" className="flex flex-wrap gap-1">
                  {selected.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="tab"
                      aria-selected={p === activePreview}
                      onClick={() => setPreviewPlatform(p)}
                      className={cn("rounded-lg px-2.5 py-1 text-xs transition-colors", p === activePreview ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                      {PLATFORM_META[p].name}
                    </button>
                  ))}
                </div>
              )}
              {activePreview ? (
                <PreviewFrame
                  key={activePreview}
                  platform={activePreview}
                  contentType={values.targets[activePreview]!.contentType}
                  caption={values.caption}
                  media={uploads.items}
                  account={accounts.data?.get(activePreview)}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("preview.pickNetwork")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <ValidationPanel issues={issues} ready={selected.length > 0} />
              {form.formState.errors.targets?.message && form.formState.isSubmitted && (
                <p className="text-sm text-danger">{t(form.formState.errors.targets.message)}</p>
              )}
              <ScheduleField
                mode={values.mode}
                onModeChange={(m) => form.setValue("mode", m, { shouldValidate: true })}
                register={form.register}
                error={form.formState.errors.scheduleAt?.message}
              />
              {tiktokSelected && <TikTokConsent control={form.control} />}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={publish.isPending || uploads.isUploading || uploadsFailed || hasErrors || !selected.length}
              >
                {publish.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                {uploads.isUploading
                  ? t("composer.waitUploads")
                  : values.mode === "schedule"
                    ? t("composer.scheduleCta")
                    : t("composer.publishCta")}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
