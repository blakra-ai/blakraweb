import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/api/ApiError";
import { Alert, Button } from "@/shared/ui";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message =
    error instanceof ApiError
      ? error.isUnauthorized
        ? t("errors.session")
        : error.status === 0
          ? t("errors.network")
          : error.message
      : t("errors.generic");
  return (
    <Alert tone="danger" title={t("errors.title")}>
      <p>{message}</p>
      {error instanceof ApiError && error.requestId && <p className="mt-1 font-mono text-xs" dir="ltr">ref: {error.requestId}</p>}
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          <RotateCcw /> {t("common.retry")}
        </Button>
      )}
    </Alert>
  );
}
