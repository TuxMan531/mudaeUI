import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { PermissionStatus } from '../../shared/types';

interface Props {
  permissions: PermissionStatus | null;
  onRecheck: () => void;
}

// Only relevant on macOS. The only must-have is Accessibility (keystroke injection);
// focusing Discord uses `open -a`, which needs no permission, so Screen Recording is
// not required for sending (only for the optional Phase-2 window capture).
export function PermissionBanner({ permissions, onRecheck }: Props) {
  if (!permissions || permissions.platform !== 'darwin') return null;
  if (permissions.accessibility) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-600/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Grant macOS Accessibility</p>
        <p className="text-amber-300/80">
          System Settings → Privacy &amp; Security → <strong>Accessibility</strong> → enable{' '}
          <strong>Electron</strong> (packaged: <strong>Mudae Companion</strong>). This lets the app paste
          commands. Then re-check. (No Screen Recording needed.)
        </p>
      </div>
      <button
        type="button"
        onClick={onRecheck}
        className="flex items-center gap-1 rounded border border-amber-600/50 px-2 py-1 text-xs hover:bg-amber-500/20"
      >
        <RefreshCw className="h-3 w-3" /> Re-check
      </button>
    </div>
  );
}
