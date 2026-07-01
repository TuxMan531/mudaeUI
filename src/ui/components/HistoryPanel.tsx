import { useState } from 'react';
import { X, Image as ImageIcon, Heart, Trash2 } from 'lucide-react';
import type { UseMudae } from '../useMudae';
import { CharacterImageModal } from './CharacterImageModal';

export function HistoryPanel({ m }: { m: UseMudae }) {
  const [modal, setModal] = useState<{ name: string; image: string | null; loading: boolean } | null>(null);

  const loadImage = async (name: string) => {
    setModal({ name, image: null, loading: true });
    const img = await m.fetchPortrait(name);
    setModal({ name, image: img, loading: false });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">History</h2>
          <p className="text-sm text-zinc-500">{m.history.length} entries · rolls &amp; claims, kept for stats.</p>
        </div>
        {m.history.length > 0 && (
          <button
            type="button"
            onClick={m.clearHistory}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {m.history.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-500">
          No history yet — roll some characters and they’ll log here (name, category, ranks, kakera).
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Character</th>
                <th className="px-2 py-2 text-center font-semibold">Kakera</th>
                <th className="px-2 py-2 text-center font-semibold">Claim</th>
                <th className="px-2 py-2 text-center font-semibold">Like</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {m.history.map((h) => (
                <tr key={h.id} className="border-t border-zinc-800/70 hover:bg-zinc-900/40">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      {h.claimed && <Heart className="h-3 w-3 shrink-0 fill-current text-rose-400" />}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-100">{h.name}</p>
                        {h.category && <p className="truncate text-[11px] text-zinc-500">{h.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 text-center font-mono text-kakera">{h.kakera ?? '—'}</td>
                  <td className="px-2 text-center font-mono text-zinc-300">{h.claimRank ? `#${h.claimRank}` : '—'}</td>
                  <td className="px-2 text-center font-mono text-zinc-300">{h.likeRank ? `#${h.likeRank}` : '—'}</td>
                  <td className="px-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void loadImage(h.name)}
                        title="Load image ($im)"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => m.removeHistory(h.id)}
                        title="Remove (if incorrect)"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-red-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <CharacterImageModal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
