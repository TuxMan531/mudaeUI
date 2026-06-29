/** Format a millisecond duration compactly, e.g. "1h 23m", "4m 05s", "12s". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'ready';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
