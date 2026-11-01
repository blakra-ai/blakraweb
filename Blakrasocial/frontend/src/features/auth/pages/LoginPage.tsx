import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Input, Label } from "@/shared/ui";
import { AuthLayout } from "../components/AuthLayout";
import { authErrorMessage } from "../components/authError";
import { safeNext } from "../components/RequireAuth";
import { useAuth } from "../context/AuthProvider";

export default function LoginPage() {
  const { t } = useTranslation();
  const { status, session } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "signedIn" || status === "embedded") return <Navigate to={next} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await session.signIn(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err, t));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t("auth.signInTitle")} description={t("auth.signInDescription")}>
      <form className="space-y-4" onSubmit={(e) => void submit(e)} noValidate={false}>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="username" dir="ltr" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" type="password" autoComplete="current-password" dir="ltr" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} {t("auth.signIn")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("auth.forgot")}</p>
      </form>
    </AuthLayout>
  );
}
