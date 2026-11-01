import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Input, Label, Skeleton } from "@/shared/ui";
import { authApi } from "../api/authApi";
import { AuthLayout } from "../components/AuthLayout";
import { authErrorMessage } from "../components/authError";
import { newPasswordProblem, PasswordFields } from "../components/PasswordFields";
import { useAuth } from "../context/AuthProvider";

/** The link token sits in the URL fragment (#…), which browsers never send to servers. It is read
 *  once and removed from the address bar so it doesn't stay in history. */
function takeTokenFromUrl(): string {
  const token = window.location.hash.replace(/^#/, "");
  if (token) window.history.replaceState(null, "", window.location.pathname);
  return token;
}

export default function InvitePage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [token] = useState(takeTokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: ({ signal }) => authApi.inspectInvite(token, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });

  if (!token || invite.isError) {
    return (
      <AuthLayout title={t("auth.linkProblemTitle")}>
        <Alert tone="warning">{invite.isError ? authErrorMessage(invite.error, t) : t("auth.linkExpired")}</Alert>
        <Button asChild variant="link" className="mt-3 px-0">
          <Link to="/login">{t("auth.goToSignIn")}</Link>
        </Button>
      </AuthLayout>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!invite.data) return;
    const problem = newPasswordProblem(password, confirm, invite.data.email);
    if (problem) return setError(t(problem, { min: 10 }));
    setBusy(true);
    setError(null);
    try {
      await session.acceptInvite(token, password);
      navigate("/compose", { replace: true });
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  const reset = invite.data?.passwordSet;
  return (
    <AuthLayout title={t(reset ? "auth.resetTitle" : "auth.welcomeTitle")} description={t(reset ? "auth.resetDescription" : "auth.welcomeDescription")}>
      {invite.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          {error && <Alert tone="danger">{error}</Alert>}
          <p className="text-sm">
            <bdi className="font-medium">{invite.data.title}</bdi>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">{t("auth.email")}</Label>
            <Input id="invite-email" type="email" autoComplete="username" dir="ltr" readOnly value={invite.data.email} />
          </div>
          <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t("auth.savePassword")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
