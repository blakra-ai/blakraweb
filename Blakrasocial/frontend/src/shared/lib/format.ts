export function formatBytes(bytes: number, locale: string): string {
  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatDuration(seconds: number, locale: string): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  const nf = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 });
  return `${new Intl.NumberFormat(locale).format(m)}:${nf.format(s)}`;
}

export function ratioLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}
