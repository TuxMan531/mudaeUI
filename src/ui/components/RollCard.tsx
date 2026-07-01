import { Gem, Heart, Star, Lock, RefreshCw, Zap } from 'lucide-react';
import type { RolledCharacter } from '../types';
import { cn } from '../lib/utils';
import { useCachedImage } from '../lib/useCachedImage';

export function RollCard({
  roll,
  ocrBusy,
  onReload,
}: {
  roll: RolledCharacter | null;
  ocrBusy: boolean;
  onReload?: (id: string, name: string) => void;
}) {
  const src = useCachedImage(roll?.name, roll?.portrait);
  if (!roll) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 text-sm text-zinc-500">
        {ocrBusy ? 'Reading your roll…' : 'Roll a character — it’ll appear here.'}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-4 rounded-xl border bg-zinc-900/60 p-4', roll.claimedBy ? 'border-kakera/50' : 'border-zinc-700')}>
      {/* Pixel-perfect cropped capture of the Discord message */}
      <div className="w-1/2 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-black">
        {src ? (
          <img src={src} alt={roll.name} className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-40 place-items-center text-xs text-zinc-600">no image</div>
        )}
      </div>

      {/* Parsed fields (best-effort text, reliable digits) */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-zinc-100">{roll.name}</h3>
            {roll.claimedBy && (
              <span className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                <Lock className="h-3 w-3" /> {roll.claimedBy}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-zinc-400">{roll.series || '—'}</p>
          {roll.claimedBy && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-kakera">
              <Zap className="h-3 w-3" /> already owned — react kakera for value
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {roll.kakera !== undefined && (
            <Stat icon={<Gem className="h-3.5 w-3.5 text-kakera" />} label={`${roll.kakera} ka`} />
          )}
          {roll.claimRank !== undefined && (
            <Stat icon={<Heart className="h-3.5 w-3.5 text-rose-400" />} label={`#${roll.claimRank}`} />
          )}
          {roll.likeRank !== undefined && (
            <Stat icon={<Star className="h-3.5 w-3.5 text-amber-400" />} label={`#${roll.likeRank}`} />
          )}
        </div>

        <div className="mt-auto flex items-center justify-between text-[11px] text-zinc-500">
          <span className="font-mono">{roll.command}</span>
          <div className="flex items-center gap-2">
            {onReload && (
              <button
                type="button"
                onClick={() => onReload(roll.id, roll.name)}
                disabled={roll.reloading}
                title="Re-pull $im for fresh art, kakera & ranks"
                className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-700 disabled:opacity-60"
              >
                <RefreshCw className={cn('h-3 w-3', roll.reloading && 'animate-spin')} /> $im
              </button>
            )}
            <span>{new Date(roll.at).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className={cn('flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-1')}>
      {icon}
      <span className="font-mono text-zinc-200">{label}</span>
    </span>
  );
}
