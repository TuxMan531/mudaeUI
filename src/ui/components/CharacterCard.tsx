import { Gem, Heart, Star, RefreshCw, Download, X, Loader2, Key } from 'lucide-react';
import type { CollectedCharacter } from '../types';
import { cn } from '../lib/utils';
import { useCachedImage } from '../lib/useCachedImage';

interface Props {
  char: CollectedCharacter;
  onLoad: (name: string) => void;
  onRemove: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function CharacterCard({ char, onLoad, onRemove, onToggleStar }: Props) {
  const loaded = char.loadedAt !== undefined;
  const src = useCachedImage(char.name, char.portrait);

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border bg-zinc-900/60',
        char.starred ? 'border-amber-500/70' : 'border-zinc-700',
      )}
    >
      <button
        type="button"
        onClick={() => onToggleStar(char.id)}
        title={char.starred ? 'Unpin' : 'Pin to top (UI only)'}
        className={cn(
          'absolute left-1 top-1 z-10 rounded bg-black/40 p-1 hover:bg-black/70',
          char.starred ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100',
        )}
      >
        <Star className={cn('h-3 w-3', char.starred && 'fill-current')} />
      </button>
      <button
        type="button"
        onClick={() => onRemove(char.id)}
        title="Remove"
        className="absolute right-1 top-1 z-10 rounded bg-black/40 p-1 text-zinc-400 hover:bg-black/70 hover:text-zinc-100"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="grid aspect-[3/4] place-items-center bg-black">
        {src ? (
          <img src={src} alt={char.name} className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-xs text-zinc-600">{loaded ? 'no image' : 'not loaded'}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100" title={char.name}>
            {char.name}
          </p>
          {char.category && <p className="truncate text-[11px] text-zinc-500">{char.category}</p>}
        </div>

        {loaded && (
          <div className="flex flex-wrap gap-1 text-[11px]">
            {char.kakera !== undefined && <Pill icon={<Gem className="h-3 w-3 text-kakera" />} label={`${char.kakera}`} />}
            {char.claimRank !== undefined && <Pill icon={<Heart className="h-3 w-3 text-rose-400" />} label={`#${char.claimRank}`} />}
            {char.likeRank !== undefined && <Pill icon={<Star className="h-3 w-3 text-amber-400" />} label={`#${char.likeRank}`} />}
            {!!char.keys && char.keys > 0 && <Pill icon={<Key className="h-3 w-3 text-yellow-500" />} label={`${char.keys}`} />}
          </div>
        )}

        <button
          type="button"
          disabled={char.loading}
          onClick={() => onLoad(char.name)}
          className={cn(
            'mt-auto flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs',
            loaded
              ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'border-roll/60 bg-roll/20 text-zinc-100 hover:bg-roll/30',
            char.loading && 'cursor-not-allowed opacity-60',
          )}
        >
          {char.loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
            </>
          ) : loaded ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Reload
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" /> Load $im
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-0.5 rounded-full border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-200">
      {icon}
      {label}
    </span>
  );
}
