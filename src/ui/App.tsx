import { useState } from 'react';
import { Settings as SettingsIcon, Heart, Sparkles } from 'lucide-react';
import { useMudae } from './useMudae';
import { CommandPad } from './components/CommandPad';
import { CooldownBar } from './components/CooldownBar';
import { PermissionBanner } from './components/PermissionBanner';
import { Settings } from './components/Settings';
import { cn } from './lib/utils';

export default function App() {
  const m = useMudae();
  const [showSettings, setShowSettings] = useState(false);

  if (!m.settings) {
    return <div className="grid h-full place-items-center bg-zinc-950 text-zinc-500">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-roll" />
          <h1 className="text-base font-semibold">Mudae Companion</h1>
          <span className="ml-2 rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
            {m.settings.prefixMode === 'slash' ? '/cmd' : '$cmd'} → {m.settings.windowTitleMatch}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm',
            showSettings ? 'border-roll bg-roll/20' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700',
          )}
        >
          <SettingsIcon className="h-4 w-4" /> Settings
        </button>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Left: command pad */}
        <main className="min-w-0 flex-1 overflow-auto p-5">
          <div className="mb-4 space-y-3">
            <PermissionBanner permissions={m.permissions} onRecheck={m.refreshPermissions} />
            <CooldownBar remaining={m.remaining} onClear={m.clearCooldown} />
          </div>
          {showSettings ? (
            <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-300">Settings</h2>
              <Settings settings={m.settings} onChange={m.updateSettings} />
            </div>
          ) : (
            <CommandPad onSend={m.send} remaining={m.remaining} />
          )}
        </main>

        {/* Right: claim reminder + activity log */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/30">
          <div className="flex items-start gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-400">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-kakera" />
            <p>
              <strong className="text-zinc-200">Claiming &amp; kakera are reactions.</strong> This app sends
              text commands — click the heart / kakera on Mudae&apos;s message in Discord yourself.
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
                {!entry.ok && <span className="ml-2 text-red-400">✕ {entry.error}</span>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
