import { useMemo, useState } from 'react';
import { Plus, ListPlus, Layers, Loader2, Hash, RefreshCw, Gem } from 'lucide-react';
import type { CollectedCharacter, CollectionStats } from '../types';
import { CharacterCard } from './CharacterCard';
import { cn } from '../lib/utils';

/** A character store (collection or wishlist) — same UI, different data + actions. */
export interface CharStore {
  items: CollectedCharacter[];
  collecting: boolean;
  /** Text of the last list reply (e.g. $mm / $wl), for "add from last". */
  lastListText?: string;
  /** The list command label, e.g. "$mm" / "$wl". */
  listLabel: string;
  add: (name: string) => void;
  remove: (id: string) => void;
  toggleStar: (id: string) => void;
  load: (name: string) => void;
  addNames: (text: string) => void;
  autoCollect: () => void;
  /** Collection-only: Mudae's harem summary stats + a refresh ($mmv). */
  stats?: CollectionStats | null;
  refreshStats?: () => void;
}

type SortMode = 'rank' | 'category';

const byRank = (a: CollectedCharacter, b: CollectedCharacter) =>
  (a.claimRank ?? Infinity) - (b.claimRank ?? Infinity);

export function CollectionGrid({ store }: { store: CharStore }) {
  const [name, setName] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('rank');

  // Rank mode: starred first, then by claim rank ascending (#1 is best).
  const flat = useMemo(() => {
    return [...store.items].sort((a, b) => {
      if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
      return byRank(a, b);
    });
  }, [store.items]);

  // Category mode: a "Pinned" group, then one group per category (each sorted by rank).
  const groups = useMemo(() => {
    const starred = store.items.filter((c) => c.starred).sort(byRank);
    const byCat = new Map<string, CollectedCharacter[]>();
    for (const c of store.items.filter((c) => !c.starred)) {
      const k = c.category || 'Uncategorized';
      (byCat.get(k) ?? byCat.set(k, []).get(k)!).push(c);
    }
    const cats = [...byCat.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, items]) => ({ cat, items: items.sort(byRank) }));
    return { starred, cats };
  }, [store.items]);

  const add = () => {
    if (name.trim()) {
      store.add(name.trim());
      setName('');
    }
  };

  const cardProps = { onLoad: store.load, onRemove: store.remove, onToggleStar: store.toggleStar };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Cards</h3>
          {store.items.length > 0 && (
            <div className="flex overflow-hidden rounded-lg border border-zinc-700 text-xs">
              <SortTab active={sortMode === 'rank'} onClick={() => setSortMode('rank')} icon={<Hash className="h-3 w-3" />} label="Rank" />
              <SortTab active={sortMode === 'category'} onClick={() => setSortMode('category')} icon={<Layers className="h-3 w-3" />} label="Category" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={store.collecting}
            onClick={() => store.autoCollect()}
            title={`Run ${store.listLabel}, read Page 1/N, and auto-fetch every page`}
            className="flex items-center gap-1.5 rounded-lg border border-roll/60 bg-roll/20 px-2 py-1 text-xs hover:bg-roll/30 disabled:opacity-60"
          >
            {store.collecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
            {store.collecting ? 'collecting…' : 'Auto-collect all'}
          </button>
          {store.lastListText && (
            <button
              type="button"
              onClick={() => store.addNames(store.lastListText!)}
              title={`Best-effort: read names from the last ${store.listLabel} reply only`}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            >
              <ListPlus className="h-3.5 w-3.5" /> From last {store.listLabel}
            </button>
          )}
        </div>
      </div>

      {store.refreshStats && (
        <CollectionStatsBar count={store.items.length} stats={store.stats} onRefresh={store.refreshStats} />
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a character by name…"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-roll"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 rounded-lg border border-roll/60 bg-roll/20 px-3 py-1.5 text-sm hover:bg-roll/30"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {store.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-500">
          No characters yet. Add one by name, or hit <span className="font-mono">Auto-collect all</span> to read every
          page of <span className="font-mono">{store.listLabel}</span>. Then <span className="font-mono">Load $im</span>{' '}
          a card to fetch its image, kakera &amp; ranks.
        </p>
      ) : sortMode === 'rank' ? (
        <Grid chars={flat} {...cardProps} />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.starred.length > 0 && <CategorySection title="★ Pinned" chars={groups.starred} {...cardProps} />}
          {groups.cats.map(({ cat, items }) => (
            <CategorySection key={cat} title={cat} chars={items} {...cardProps} />
          ))}
        </div>
      )}
    </div>
  );
}

type CardProps = {
  onLoad: (name: string) => void;
  onRemove: (id: string) => void;
  onToggleStar: (id: string) => void;
};

function Grid({ chars, ...cardProps }: { chars: CollectedCharacter[] } & CardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {chars.map((c) => (
        <CharacterCard key={c.id} char={c} {...cardProps} />
      ))}
    </div>
  );
}

function CategorySection({ title, chars, ...cardProps }: { title: string; chars: CollectedCharacter[] } & CardProps) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title} <span className="text-zinc-600">({chars.length})</span>
      </h4>
      <Grid chars={chars} {...cardProps} />
    </div>
  );
}

function SortTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1',
        active ? 'bg-roll/20 text-zinc-100' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CollectionStatsBar({ count, stats, onRefresh }: { count: number; stats?: CollectionStats | null; onRefresh: () => void }) {
  const total = stats?.avgKakera !== undefined ? stats.avgKakera * count : undefined;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <StatNum label="Characters" value={count.toLocaleString()} />
      {total !== undefined && (
        <StatNum icon={<Gem className="h-3.5 w-3.5 text-kakera" />} label="Total kakera" value={total.toLocaleString()} />
      )}
      {stats?.avgKakera !== undefined && <StatNum label="Avg value" value={stats.avgKakera.toLocaleString()} />}
      {stats?.top15Value !== undefined && <StatNum label="Top 15 value" value={stats.top15Value.toLocaleString()} />}
      <button
        type="button"
        onClick={onRefresh}
        title="Refresh stats from $mmv"
        className="ml-auto flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
      >
        <RefreshCw className="h-3 w-3" /> $mmv
      </button>
    </div>
  );
}

function StatNum({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
        <div className="font-mono text-sm font-bold text-zinc-100">{value}</div>
      </div>
    </div>
  );
}
