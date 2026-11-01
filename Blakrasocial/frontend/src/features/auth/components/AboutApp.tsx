import { useTranslation } from "react-i18next";
import { site } from "@/shared/lib/site";

/** What the app is, on the public sign-in page: reviewers and visitors see it without an account. */
export function AboutApp() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="about-title" className="w-full max-w-sm space-y-2 text-sm text-muted-foreground">
      <h2 id="about-title" className="font-semibold text-foreground">{t("auth.about.title")}</h2>
      <p>{t("auth.about.body", { company: site.company })}</p>
      <p>{t("auth.about.control")}</p>
      <p>{t("auth.about.access")}</p>
      {site.contactEmail && (
        <p>
          {t("auth.about.contact")}{" "}
          <a className="underline hover:text-foreground" href={`mailto:${site.contactEmail}`} dir="ltr">{site.contactEmail}</a>
        </p>
      )}
    </section>
  );
}
