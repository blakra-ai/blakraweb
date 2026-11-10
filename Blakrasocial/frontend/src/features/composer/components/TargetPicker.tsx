import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Account, Platform } from "@/shared/api/types";
import { PLATFORMS } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";
import { PLATFORM_META, PlatformTile } from "@/shared/platform";

interface Props {
  selected: Platform[];
  accounts: Map<Platform, Account> | undefined;
  onToggle: (platform: Platform) => void;
}

export function TargetPicker({ selected, accounts, onToggle }: Props) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{t("composer.networks")}</legend>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const active = selected.includes(platform);
          const connected = platform === "whatsapp" || !accounts || accounts.has(platform);
          return (
            <button
              key={platform}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => onToggle(platform)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 ps-1.5 pe-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                active && "border-primary ring-2 ring-ring",
                !connected && "opacity-60",
              )}
            >
              <PlatformTile platform={platform} size="sm" />
              <span>{PLATFORM_META[platform].name}</span>
              {!connected && <span className="text-xs text-muted-foreground">· {t("connections.notConnected")}</span>}
              {active && (
                <span className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
