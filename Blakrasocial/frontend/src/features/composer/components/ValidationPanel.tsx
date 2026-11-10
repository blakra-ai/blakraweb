import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PLATFORM_META } from "@/shared/platform";
import type { ClientIssue } from "../validation/clientValidator";

export function ValidationPanel({ issues, ready }: { issues: ClientIssue[]; ready: boolean }) {
  const { t } = useTranslation();
  if (!issues.length) {
    return ready ? (
      <p className="flex items-center gap-2 text-sm text-success" role="status">
        <CheckCircle2 className="size-4" /> {t("composer.allGood")}
      </p>
    ) : null;
  }
  return (
    <ul className="space-y-1.5" aria-live="polite" aria-label={t("composer.checks")}>
      {issues.map((issue, i) => {
        const Icon = issue.severity === "error" ? XCircle : AlertTriangle;
        return (
          <li key={`${issue.platform}-${issue.code}-${i}`} className="flex items-start gap-2 text-sm animate-fade-up">
            <Icon className={issue.severity === "error" ? "mt-0.5 size-4 shrink-0 text-danger" : "mt-0.5 size-4 shrink-0 text-warning"} />
            <span>
              {issue.platform && <strong className="font-medium">{PLATFORM_META[issue.platform].name}: </strong>}
              {t(`issues.${issue.code}`, { ...issue.params, defaultValue: issue.code })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
