import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

const tones = {
  info: { icon: Info, cls: "border-primary/30 bg-primary/5 text-foreground" },
  warning: { icon: AlertTriangle, cls: "border-warning/50 bg-warning/10 text-foreground" },
  success: { icon: CheckCircle2, cls: "border-success/40 bg-success/5 text-foreground" },
  danger: { icon: XCircle, cls: "border-danger/40 bg-danger/5 text-foreground" },
} as const;

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string }) {
  const { icon: Icon, cls } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
