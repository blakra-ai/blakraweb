import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/app/layout/PageParts";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/shared/ui";
import { authErrorMessage } from "../components/authError";
import { newPasswordProblem, PasswordFields } from "../components/PasswordFields";
import { useAuth } from "../context/AuthProvider";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const problem = newPasswordProblem(password, confirm, user.email);
    if (problem) return setError(t(problem, { min: 10 }));
    setBusy(true);
    setError(null);
    try {
      await session.changePassword(current, password);
      setCurrent("");
      setPassword("");
      setConfirm("");
      toast.success(t("auth.passwordChanged"));
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("auth.accountTitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t("admin.name")}: </span>
              <bdi>{user.title}</bdi>
            </p>
            <p>
              <span className="text-muted-foreground">{t("auth.email")}: </span>
              <bdi dir="ltr">{user.email}</bdi>
            </p>
            <p>
              <span className="text-muted-foreground">{t("admin.role")}: </span>
              {t(`admin.roles.${user.role}`)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.changePassword")}</CardTitle>
            <CardDescription>{t("auth.changePasswordHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void submit(e)}>
              {error && <Alert tone="danger">{error}</Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="current-password">{t("auth.currentPassword")}</Label>
                <Input id="current-password" type="password" autoComplete="current-password" dir="ltr" required maxLength={128} value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} {t("auth.savePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
