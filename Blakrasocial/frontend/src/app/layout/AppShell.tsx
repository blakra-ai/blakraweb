import { Languages, LayoutList, Link2, LogOut, PenSquare, Sparkles, UserCircle, Users } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { LANGUAGES } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";

const NAV = [
  { to: "/compose", icon: PenSquare, key: "nav.compose" },
  { to: "/connections", icon: Link2, key: "nav.connections" },
  { to: "/posts", icon: LayoutList, key: "nav.posts" },
] as const;
const ADMIN_NAV = { to: "/admin", icon: Users, key: "nav.admin" } as const;

export function AppShell() {
  const { t, i18n } = useTranslation();
  const next = LANGUAGES.find((l) => !i18n.language.startsWith(l.code)) ?? LANGUAGES[0];
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "admin" ? [...NAV, ADMIN_NAV] : NAV;

  async function signOut() {
    await session.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        {t("nav.skip")}
      </a>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <span className="flex items-center gap-2 font-bold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow">
              <Sparkles className="size-4" />
            </span>
            Blakrasocial
          </span>
          <nav aria-label={t("nav.main")} className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors",
                    isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{t(key)}</span>
                <span className="sr-only sm:hidden">{t(key)}</span>
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(next.code)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("nav.language")}
          >
            <Languages className="size-4" aria-hidden /> <span className="hidden sm:inline">{next.label}</span>
          </button>
          {user && (
            <>
              <Link
                to="/account"
                className="flex max-w-40 items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t("nav.account")}
                title={user.email}
              >
                <UserCircle className="size-4 shrink-0" aria-hidden /> <bdi className="hidden truncate md:inline">{user.title}</bdi>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t("nav.signOut")}
                title={t("nav.signOut")}
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap gap-4 px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        <Link to="/privacy" className="hover:text-foreground">{t("legal.privacy.title")}</Link>
        <Link to="/terms" className="hover:text-foreground">{t("legal.terms.title")}</Link>
        <Link to="/data-deletion" className="hover:text-foreground">{t("legal.deletion.title")}</Link>
      </footer>
    </div>
  );
}
