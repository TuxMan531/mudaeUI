import { Gem, RefreshCw, Hammer } from 'lucide-react';
import type { KakeraTower as Tower } from '../types';
import { cn } from '../lib/utils';

interface Props {
  tower: Tower | null;
  onBuild: (perk: number) => void;
  onRefresh: () => void;
}

export function KakeraTower({ tower, onBuild, onRefresh }: Props) {
  if (!tower) {
    return (
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-900"
      >
        Click to load the kakera tower ($kt)
      </button>
    );
  }

  const afford = tower.balance !== undefined && tower.nextCost !== undefined && tower.balance >= tower.nextCost;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-zinc-100">Kakera Tower</span>
          {tower.level !== undefined && (
            <span className="text-zinc-400">
              Floor <span className="font-mono text-zinc-200">{tower.level}</span>
            </span>
          )}
          {tower.nextCost !== undefined && (
            <span className="flex items-center gap-1 text-zinc-400">
              next <Gem className="h-3.5 w-3.5 text-kakera" />
              <span className="font-mono text-zinc-200">{tower.nextCost.toLocaleString()}</span>
            </span>
          )}
          {tower.balance !== undefined && (
            <span className="flex items-center gap-1 text-zinc-400">
              have <Gem className="h-3.5 w-3.5 text-kakera" />
              <span className="font-mono text-zinc-200">{tower.balance.toLocaleString()}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Re-read $kt"
          className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          <RefreshCw className="h-3 w-3" /> $kt
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tower.perks.map((p) => (
          <div key={p.n} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 p-2.5">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{p.n}</span>
              <p className="text-xs text-zinc-300">{p.text}</p>
            </div>
            <button
              type="button"
              onClick={() => onBuild(p.n)}
              disabled={!afford}
              title={`Build a floor with perk ${p.n} — sends $build ${p.n}`}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs',
                afford
                  ? 'border-roll/60 bg-roll/20 text-zinc-100 hover:bg-roll/30'
                  : 'cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-500',
              )}
            >
              <Hammer className="h-3 w-3" /> build
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600">Building sends <span className="font-mono">$build &lt;perk&gt;</span>; Mudae may ask you to confirm with a reaction.</p>
    </div>
  );
}
