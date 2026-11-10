import { CalendarClock, Zap } from "lucide-react";
import { useState } from "react";
import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Input, Label } from "@/shared/ui";
import { MIN_SCHEDULE_LEAD_MINUTES, type ComposerValues } from "../schema/composerSchema";

function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Props {
  mode: ComposerValues["mode"];
  onModeChange: (mode: ComposerValues["mode"]) => void;
  register: UseFormRegister<ComposerValues>;
  error?: string | undefined;
}

export function ScheduleField({ mode, onModeChange, register, error }: Props) {
  const { t } = useTranslation();
  const [min] = useState(() => localInputValue(new Date(Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60_000)));
  const options = [
    { value: "now", icon: Zap, label: t("composer.publishNow") },
    { value: "schedule", icon: CalendarClock, label: t("composer.schedule") },
  ] as const;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label={t("composer.when")} className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => onModeChange(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition-all",
              mode === value ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {mode === "schedule" && (
        <div className="space-y-1.5 animate-fade-up">
          <Label htmlFor="schedule-at">{t("composer.scheduleAt")}</Label>
          <Input id="schedule-at" type="datetime-local" min={min} aria-invalid={Boolean(error)} {...register("scheduleAt")} />
          <p className={error ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
            {error ? t(error, { minutes: MIN_SCHEDULE_LEAD_MINUTES }) : t("composer.scheduleHelp", { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}
          </p>
        </div>
      )}
    </div>
  );
}
