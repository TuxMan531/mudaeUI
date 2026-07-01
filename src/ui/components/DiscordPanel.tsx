import { RotateCw, Bug, X } from 'lucide-react';
import type { DiscordBridge } from '../discord/useDiscordBridge';
import { cn } from '../lib/utils';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * The embedded Discord client. Stays mounted (so the page keeps observing) and is
 * only visually collapsed when hidden.
 */
export function DiscordPanel({ bridge, visible, onClose }: { bridge: DiscordBridge; visible: boolean; onClose: () => void }) {
  return (
    <div className={cn('flex min-w-0 flex-col border-l border-zinc-800 bg-zinc-950', visible ? 'w-1/2' : 'hidden')}>
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-300">
          Discord <span className="text-zinc-600">· {bridge.status}</span>
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={bridge.reload}
            title="Reload Discord"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={bridge.openDevTools}
            title="Discord DevTools (verify selectors)"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Bug className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Hide Discord"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      <webview
        ref={bridge.bind}
        src="https://discord.com/app"
        partition="persist:discord"
        useragent={CHROME_UA}
        className="flex-1"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
