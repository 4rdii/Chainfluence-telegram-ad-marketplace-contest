/** Format a stat for display – "n/a" when unavailable (null/undefined). */
export function formatStat(value: number | null | undefined): string {
  if (value == null) return 'n/a';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

/** Format a percentage stat – "n/a" when unavailable. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'n/a';
  return `${Math.round(value * 10) / 10}%`;
}
