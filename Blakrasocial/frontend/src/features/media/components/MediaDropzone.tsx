import { ImagePlus } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/shared/lib/cn";
import { ACCEPTED_TYPES, MAX_FILE_BYTES, MAX_FILES } from "../types";

export function MediaDropzone({ onFiles, disabled, remaining }: { onFiles: (files: File[]) => void; disabled?: boolean; remaining: number }) {
  const { t } = useTranslation();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_BYTES,
    maxFiles: Math.min(remaining, MAX_FILES),
    disabled: disabled || remaining <= 0,
    onDrop: (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) toast.error(t("media.rejected", { count: rejected.length }));
      if (accepted.length) onFiles(accepted);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-all duration-200 hover:border-primary/60 hover:bg-primary/5",
        isDragActive && "scale-[1.01] border-primary bg-primary/10",
        (disabled || remaining <= 0) && "pointer-events-none opacity-50",
      )}
    >
      <input {...getInputProps()} aria-label={t("media.choose")} />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ImagePlus className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-medium">{isDragActive ? t("media.dropNow") : t("media.drop")}</p>
      <p className="text-xs text-muted-foreground">{t("media.hint")}</p>
    </div>
  );
}
