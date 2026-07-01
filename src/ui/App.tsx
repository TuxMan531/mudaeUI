import { useState } from 'react';
import { Menu, Sparkles, Loader2, Heart, MessagesSquare } from 'lucide-react';
import { useMudae } from './useMudae';
import { resolveCommandText, type MudaeCommand } from './commands';
import { Sidebar, type View } from './components/Sidebar';
import { SectionPanel } from './components/SectionPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Settings } from './components/Settings';
import { CommandInput } from './components/CommandInput';
import { DiscordPanel } from './components/DiscordPanel';
import { useDiscordBridge } from './discord/useDiscordBridge';
import { cn } from './lib/utils';

export default function App() {
  const m = useMudae();
  const [view, setView] = useState<View>('roll');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compose, setCompose] = useState('');
  const [discordOpen, setDiscordOpen] = useState(true);
  const bridge = useDiscordBridge();

  if (!m.settings) {
    return <div className="grid h-full place-items-center bg-zinc-950 text-zinc-500">Loading…</div>;
  }

  const onCompose = (cmd: MudaeCommand) => {
    setCompose(`${resolveCommandText(cmd, m.settings!.prefixMode)} `);
  };

  const submitRaw = (text: string) => {
    void m.sendRaw(text);
    setCompose('');
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="z-10 flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-roll" />
            <h1 className="text-base font-semibold">Mudae Companion</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {m.ocrBusy && (
            <span className="flex items-center gap-1 text-xs text-roll">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> reading
            </span>
          )}
          <button
            type="button"
            onClick={() => setDiscordOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm',
              discordOpen ? 'border-roll bg-roll/20' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700',
            )}
          >
            <MessagesSquare className="h-4 w-4" /> Discord
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto p-5">
            {view === 'settings' ? (
              <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-300">Settings</h2>
                <Settings settings={m.settings} onChange={m.updateSettings} />
              </div>
            ) : view === 'history' ? (
              <HistoryPanel m={m} />
            ) : (
              <SectionPanel section={view} m={m} onCompose={onCompose} />
            )}
          </div>
          {/* Free-form command bar (always available) */}
          <div className="border-t border-zinc-800 p-3">
            <CommandInput value={compose} onChange={setCompose} onSubmit={submitRaw} />
          </div>
        </main>

        {/* Right rail: claim reminder + activity log (hidden while Discord is open) */}
        <aside className={cn('w-64 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/30', discordOpen ? 'hidden' : 'flex')}>
          <div className="flex items-start gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-400">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-kakera" />
            <p>
              <strong className="text-zinc-200">Claiming &amp; kakera are reactions.</strong> Click the heart /
              kakera on Mudae&apos;s message in Discord yourself.
            </p>
          </div>
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Activity</div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
            {m.log.length === 0 && <p className="px-2 text-xs text-zinc-600">No commands sent yet.</p>}
            {m.log.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'mb-1 rounded px-2 py-1 font-mono text-xs',
                  entry.ok ? 'bg-zinc-800/60 text-zinc-300' : 'bg-red-950/40 text-red-300',
                )}
                title={entry.error}
              >
                <span>{entry.text}</span>
                {!entry.ok && <span className="ml-2 text-red-400">✕</span>}
              </div>
            ))}
          </div>
        </aside>

        <DiscordPanel bridge={bridge} visible={discordOpen} onClose={() => setDiscordOpen(false)} />
      </div>

      <Sidebar open={drawerOpen} view={view} onSelect={setView} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
