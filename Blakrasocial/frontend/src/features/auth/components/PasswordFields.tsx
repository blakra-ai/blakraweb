import { useTranslation } from "react-i18next";
import { Input, Label } from "@/shared/ui";

export const MIN_PASSWORD = 10;

/** New password + confirmation; mirrors the backend rule (10–128 characters, not trivially guessable). */
export function newPasswordProblem(password: string, confirm: string, email: string): string | null {
  if (password.length < MIN_PASSWORD || password.length > 128) return "auth.passwordLength";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (new Set(password).size < 4 || (local && password.toLowerCase().includes(local))) return "auth.passwordWeak";
  if (password !== confirm) return "auth.passwordMismatch";
  return null;
}

interface Props {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
}

export function PasswordFields({ password, confirm, onPassword, onConfirm }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
        <Input id="new-password" type="password" autoComplete="new-password" dir="ltr" required minLength={MIN_PASSWORD} maxLength={128} value={password} onChange={(e) => onPassword(e.target.value)} aria-describedby="password-help" />
        <p id="password-help" className="text-xs text-muted-foreground">
          {t("auth.passwordHelp", { min: MIN_PASSWORD })}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" dir="ltr" required maxLength={128} value={confirm} onChange={(e) => onConfirm(e.target.value)} />
      </div>
    </>
  );
}
