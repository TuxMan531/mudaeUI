import { Gem, RefreshCw, ArrowUp } from 'lucide-react';
import type { KakeraShop as Shop } from '../types';
import { cn } from '../lib/utils';

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V'];

interface Props {
  shop: Shop | null;
  onUpgrade: (buyCmd: string) => void;
  onRefresh: () => void;
}

export function KakeraShop({ shop, onUpgrade, onRefresh }: Props) {
  if (!shop) {
    return (
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-900"
      >
        Click to load your kakera shop ($k)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-kakera" />
          <span className="font-mono text-xl font-bold text-zinc-100">{shop.balance?.toLocaleString() ?? '—'}</span>
          <span className="text-sm text-zinc-400">kakera</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Re-read $k"
          className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          <RefreshCw className="h-3 w-3" /> $k
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shop.badges.map((b) => {
          const afford = shop.balance !== undefined && shop.balance >= b.nextCost;
          return (
            <div key={b.name} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-100">{b.name}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                    {ROMAN[b.level] ?? b.level}
                  </span>
                </div>
                <p className="truncate text-xs text-zinc-500">{b.benefit}</p>
              </div>
              <button
                type="button"
                onClick={() => onUpgrade(b.buyCmd)}
                disabled={!afford}
                title={`Next level: ${b.nextCost} ka — sends ${b.buyCmd}`}
                className={cn(
                  'flex shrink-0 flex-col items-center rounded-lg border px-3 py-1.5 text-xs',
                  afford
                    ? 'border-roll/60 bg-roll/20 text-zinc-100 hover:bg-roll/30'
                    : 'cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-500',
                )}
              >
                <span className="flex items-center gap-1 font-mono">
                  <ArrowUp className="h-3 w-3" /> {b.nextCost.toLocaleString()}
                </span>
                <span className="text-[10px] opacity-70">{b.buyCmd}</span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-600">Upgrading sends the buy command; Mudae may ask you to confirm with a reaction.</p>
    </div>
  );
}
