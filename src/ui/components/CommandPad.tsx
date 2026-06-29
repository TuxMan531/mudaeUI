import type { SendResult } from '../../shared/types';
import type { MudaeCommand } from '../commands';
import type { CooldownKey } from '../cooldowns';
import { formatDuration } from '../lib/time';
import { cn } from '../lib/utils';

interface Props {
  commands: MudaeCommand[];
  onSend: (cmd: MudaeCommand) => Promise<SendResult>;
  remaining: (key: CooldownKey) => number;
  /** For commands that need arguments — prefill the free-form input instead of sending. */
  onCompose?: (cmd: MudaeCommand) => void;
}

export function CommandPad({ commands, onSend, remaining, onCompose }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {commands.map((cmd) => (
        <CommandButton key={cmd.id} cmd={cmd} onSend={onSend} remaining={remaining} onCompose={onCompose} />
      ))}
    </div>
  );
}

function CommandButton({
  cmd,
  onSend,
  remaining,
  onCompose,
}: { cmd: MudaeCommand } & Omit<Props, 'commands'>) {
  const remMs = cmd.cooldownKey ? remaining(cmd.cooldownKey) : 0;
  const onCooldown = remMs > 0;
  const composeMode = cmd.needsArgs && !!onCompose;

  const handleClick = () => {
    if (composeMode) onCompose!(cmd);
    else void onSend(cmd);
  };

  return (
    <button
      type="button"
      title={cmd.description}
      disabled={onCooldown}
      onClick={handleClick}
      className={cn(
        'group relative rounded-lg border px-3 py-2 text-left transition-colors',
        'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98]',
        cmd.primary && 'min-w-[88px] border-roll/60 bg-roll/20 hover:bg-roll/30',
        onCooldown && 'cursor-not-allowed opacity-40 hover:bg-zinc-800',
      )}
    >
      <span className={cn('block font-mono text-sm font-semibold text-zinc-100', cmd.primary && 'text-base')}>
        {cmd.label}
        {cmd.needsArgs && <span className="ml-1 text-[10px] text-zinc-400">…</span>}
      </span>
      <span className="block max-w-[150px] truncate text-[11px] leading-tight text-zinc-400">
        {onCooldown ? `ready in ${formatDuration(remMs)}` : cmd.description}
      </span>
    </button>
  );
}
