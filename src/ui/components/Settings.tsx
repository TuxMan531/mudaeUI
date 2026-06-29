import { useState } from 'react';
import { Search } from 'lucide-react';
import type { AppSettings, WindowInfo } from '../../shared/types';
import { cn } from '../lib/utils';

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => Promise<unknown>;
}

export function Settings({ settings, onChange }: Props) {
  const [windows, setWindows] = useState<WindowInfo[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      setWindows(await window.mudae.listWindows());
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Target window */}
      <Field label="Target (app name on macOS · window title on Windows)" hint='Usually just "Discord".'>
        <div className="flex gap-2">
          <input
            value={settings.windowTitleMatch}
            onChange={(e) => onChange({ windowTitleMatch: e.target.value })}
            className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100 outline-none focus:border-roll"
            placeholder="Discord"
          />
          <button
            type="button"
            onClick={scan}
            className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 hover:bg-zinc-700"
          >
            <Search className="h-3.5 w-3.5" /> {scanning ? '…' : 'Scan'}
          </button>
        </div>
        {windows && (
          <div className="mt-2 max-h-32 overflow-auto rounded border border-zinc-800">
            {windows.length === 0 && <p className="px-2 py-1 text-xs text-zinc-500">No windows found (grant permissions on macOS).</p>}
            {windows.map((w) => (
              <button
                key={w.title}
                type="button"
                onClick={() => onChange({ windowTitleMatch: w.title })}
                className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-zinc-800"
                title={w.title}
              >
                {w.title}
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* Prefix mode */}
      <Field label="Command form" hint="Slash applies to roll commands; utilities always use $.">
        <div className="flex gap-2">
          {(['dollar', 'slash'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ prefixMode: mode })}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 font-mono',
                settings.prefixMode === mode
                  ? 'border-roll bg-roll/20 text-zinc-100'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800',
              )}
            >
              {mode === 'dollar' ? '$wa' : '/wa'}
            </button>
          ))}
        </div>
      </Field>

      {/* Throttle */}
      <Field label="Throttle (ms between sends)" hint="Anti-spam guard; lowest Discord-ToS risk.">
        <input
          type="number"
          min={0}
          step={100}
          value={settings.throttleMs}
          onChange={(e) => onChange({ throttleMs: Math.max(0, Number(e.target.value) || 0) })}
          className="w-32 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100 outline-none focus:border-roll"
        />
      </Field>

      {/* Restore clipboard */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.restoreClipboard}
          onChange={(e) => onChange({ restoreClipboard: e.target.checked })}
        />
        <span className="text-zinc-300">Restore my clipboard after each send</span>
      </label>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5">
        <span className="font-medium text-zinc-200">{label}</span>
        {hint && <span className="ml-2 text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
