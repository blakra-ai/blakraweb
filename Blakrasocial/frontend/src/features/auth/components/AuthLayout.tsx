import { Languages, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LANGUAGES } from "@/shared/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

/** Centered card used by the sign-in and set-password screens; `aside` shows below the card. */
export function AuthLayout({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const next = LANGUAGES.find((l) => !i18n.language.startsWith(l.code)) ?? LANGUAGES[0];
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <span className="flex items-center gap-2 text-lg font-bold">
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow">
          <Sparkles className="size-4" />
        </span>
        Blakrasocial
      </span>
      <Card className="w-full max-w-sm animate-fade-up">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {aside}
      <footer className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <button type="button" onClick={() => void i18n.changeLanguage(next.code)} className="flex items-center gap-1 hover:text-foreground">
          <Languages className="size-3.5" aria-hidden /> {next.label}
        </button>
        <Link to="/privacy" className="hover:text-foreground">{t("legal.privacy.title")}</Link>
        <Link to="/terms" className="hover:text-foreground">{t("legal.terms.title")}</Link>
        <Link to="/data-deletion" className="hover:text-foreground">{t("legal.deletion.title")}</Link>
      </footer>
    </div>
  );
}
