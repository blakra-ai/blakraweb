import { ArrowLeft, Languages, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LANGUAGES } from "@/shared/i18n";
import { site } from "@/shared/lib/site";
import { legalText, type LegalDoc } from "./content";

const UPDATED = "2026-11-01";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t, i18n } = useTranslation();
  const next = LANGUAGES.find((l) => !i18n.language.startsWith(l.code)) ?? LANGUAGES[0];
  const vars = {
    company: site.company,
    email: site.contactEmail || "—",
    site: window.location.host,
  };
  const text = legalText(doc, i18n.language, vars);

  useEffect(() => {
    document.title = `${text.title} · Blakrasocial`;
  }, [text.title]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow">
            <Sparkles className="size-4" />
          </span>
          Blakrasocial
        </Link>
        <button type="button" onClick={() => void i18n.changeLanguage(next.code)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Languages className="size-4" aria-hidden /> {next.label}
        </button>
      </header>
      <article className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{text.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("legal.updated")} <time dateTime={UPDATED}>{new Date(UPDATED).toLocaleDateString(i18n.language)}</time>
          </p>
        </div>
        {text.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p} className="leading-relaxed text-foreground/90">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
      <nav className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 text-sm">
        <Link to="/privacy" className="text-primary hover:underline">{t("legal.privacy.title")}</Link>
        <Link to="/terms" className="text-primary hover:underline">{t("legal.terms.title")}</Link>
        <Link to="/data-deletion" className="text-primary hover:underline">{t("legal.deletion.title")}</Link>
        <Link to="/" className="ms-auto flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("legal.back")}
        </Link>
      </nav>
    </div>
  );
}
