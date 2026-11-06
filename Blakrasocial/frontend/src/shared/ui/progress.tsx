import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/shared/lib/cn";

export function Progress({ value, className, label }: { value: number; className?: string; label: string }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      aria-label={label}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
