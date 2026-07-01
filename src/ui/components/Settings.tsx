import type { AppSettings } from '../../shared/types';
import { cn } from '../lib/utils';

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => Promise<unknown>;
}

export function Settings({ settings, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5 text-sm">
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

      <Field label="Claim text" hint="Sent by the big Claim button to claim the latest roll.">
        <input
          value={settings.claimText}
          onChange={(e) => onChange({ claimText: e.target.value })}
          className="w-40 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-zinc-100 outline-none focus:border-roll"
          placeholder="+:100:"
        />
      </Field>

      <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
        Discord runs embedded in the app — open it with the <strong className="text-zinc-300">Discord</strong> button
        to log in once or claim manually. No Screen Recording or Accessibility permissions needed.
      </p>
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
