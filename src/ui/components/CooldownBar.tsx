import { COOLDOWNS, type CooldownKey } from '../cooldowns';
import { formatDuration } from '../lib/time';
import { cn } from '../lib/utils';

// Cooldowns we actively track from button presses in Phase 1.
const TRACKED: CooldownKey[] = ['daily', 'dk', 'vote'];

interface Props {
  remaining: (key: CooldownKey) => number;
  onClear: (key: CooldownKey) => void;
}

export function CooldownBar({ remaining, onClear }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TRACKED.map((key) => {
        const def = COOLDOWNS[key];
        const remMs = remaining(key);
        const ready = remMs <= 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onClear(key)}
            title={ready ? `${def.label} ready` : `${def.note} Click to clear timer.`}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
              ready
                ? 'border-emerald-600/50 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-600/40 bg-amber-500/10 text-amber-300',
            )}
          >
            <span className="font-mono font-semibold">{def.label}</span>
            <span>{ready ? 'ready' : formatDuration(remMs)}</span>
          </button>
        );
      })}
      <span className="text-[11px] text-zinc-500">click a chip to clear its timer</span>
    </div>
  );
}
