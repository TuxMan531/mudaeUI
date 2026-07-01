import { Gem, Heart, Star, RefreshCw } from 'lucide-react';
import type { RolledCharacter } from '../types';
import { cn } from '../lib/utils';
import { useCachedImage } from '../lib/useCachedImage';

/** Read-only mini cards for recent rolls (Roll tab). Caller filters by age + sort. */
export function RecentRolls({
  rolls,
  onReload,
}: {
  rolls: RolledCharacter[];
  onReload?: (id: string, name: string) => void;
}) {
  if (rolls.length === 0) {
    return <p className="px-1 text-xs text-zinc-600">No recent rolls — they clear after 2 minutes.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {rolls.map((r) => (
        <RecentRollCard key={r.id} r={r} onReload={onReload} />
      ))}
    </div>
  );
}

function RecentRollCard({ r, onReload }: { r: RolledCharacter; onReload?: (id: string, name: string) => void }) {
  const src = useCachedImage(r.name, r.portrait);
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/60">
      {onReload && (
        <button
          type="button"
          onClick={() => onReload(r.id, r.name)}
          disabled={r.reloading}
          title="Re-pull $im for fresh art, kakera & ranks"
          className="absolute right-1 top-1 z-10 rounded bg-black/50 p-1 text-zinc-300 hover:bg-black/80 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-3 w-3', r.reloading && 'animate-spin')} />
        </button>
      )}
      <div className="grid aspect-[3/4] place-items-center bg-black">
        {src ? (
          <img src={src} alt={r.name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-zinc-600">no image</span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2">
        <p className="truncate text-sm font-semibold text-zinc-100" title={r.name}>
          {r.name}
        </p>
        {r.series && <p className="truncate text-[11px] text-zinc-500">{r.series}</p>}
        <div className="flex flex-wrap gap-1 text-[11px]">
          {r.kakera !== undefined && <Pill icon={<Gem className="h-3 w-3 text-kakera" />} label={`${r.kakera}`} />}
          {r.claimRank !== undefined && <Pill icon={<Heart className="h-3 w-3 text-rose-400" />} label={`#${r.claimRank}`} />}
          {r.likeRank !== undefined && <Pill icon={<Star className="h-3 w-3 text-amber-400" />} label={`#${r.likeRank}`} />}
        </div>
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
