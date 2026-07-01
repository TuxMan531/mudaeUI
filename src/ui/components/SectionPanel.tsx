import { useState } from 'react';
import { Dices, RefreshCw, Heart, Zap } from 'lucide-react';
import { commandsForSection, SECTION_META, type CommandSection, type MudaeCommand } from '../commands';
import { COOLDOWNS, type CooldownKey } from '../cooldowns';
import { formatDuration } from '../lib/time';
import { cn } from '../lib/utils';
import type { ClaimResult, UseMudae } from '../useMudae';
import { CommandPad } from './CommandPad';
import { RollCard } from './RollCard';
import { RecentRolls } from './RecentRolls';
import { CollectionGrid, type CharStore } from './CollectionGrid';
import { KakeraShop } from './KakeraShop';
import { KakeraTower } from './KakeraTower';

interface Props {
  section: CommandSection;
  m: UseMudae;
  onCompose: (cmd: MudaeCommand) => void;
}

export function SectionPanel({ section, m, onCompose }: Props) {
  const meta = SECTION_META[section];

  const collectionStore: CharStore = {
    items: m.collection,
    collecting: m.collecting,
    listLabel: '$mm',
    add: m.addCharacter,
    remove: m.removeCharacter,
    toggleStar: m.toggleStar,
    load: m.loadCharacter,
    addNames: m.addNamesFromHarem,
    autoCollect: m.autoCollectAll,
    stats: m.collectionStats,
    refreshStats: m.refreshCollectionStats,
  };
  const wishlistStore: CharStore = {
    items: m.wishlist,
    collecting: m.collecting,
    listLabel: '$wl',
    add: m.addWish,
    remove: m.removeWish,
    toggleStar: m.toggleWishStar,
    load: m.loadWish,
    addNames: m.addWishNames,
    autoCollect: m.autoCollectWishlist,
  };

  const recentRolls = m.rolledHistory
    .filter((r) => m.now - r.at < 120_000)
    .sort((a, b) => (a.claimRank ?? Infinity) - (b.claimRank ?? Infinity));

  const kCmd = commandsForSection('kakera').find((c) => c.id === 'k');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">{meta.title}</h2>
        <p className="text-sm text-zinc-500">{meta.blurb}</p>
      </div>

      <CommandPad commands={commandsForSection(section)} onSend={m.send} remaining={m.remaining} onCompose={onCompose} />

      {section === 'roll' && (
        <div className="flex flex-col gap-3">
          <RollStats m={m} />
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <RollCard roll={m.lastRoll} ocrBusy={m.ocrBusy} onReload={m.reloadRoll} />
            </div>
            <div className="flex w-40 shrink-0 flex-col gap-2">
              <ClaimButton onClaim={m.claim} />
              <button
                type="button"
                onClick={() => void m.sendRaw('$ku')}
                title="Check your kakera react power ($ku) — react with the kakera emoji on a roll someone already owns to earn kakera"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-kakera/50 bg-kakera/10 px-2 py-2 text-xs font-semibold text-kakera hover:bg-kakera/20"
              >
                <Zap className="h-4 w-4" /> $ku power
                {m.cooldowns.power !== undefined && m.remaining('power') > 0 && (
                  <span className="font-mono text-[10px] text-zinc-400">{formatDuration(m.remaining('power'))}</span>
                )}
              </button>
            </div>
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent rolls</h3>
          <RecentRolls rolls={recentRolls} onReload={m.reloadRoll} />
        </div>
      )}

      {section === 'kakera' && (
        <div className="flex flex-col gap-5">
          <KakeraShop
            shop={m.kakeraShop}
            onUpgrade={(cmd) => void m.sendRaw(cmd)}
            onRefresh={() => kCmd && void m.send(kCmd)}
          />
          <KakeraTower
            tower={m.kakeraTower}
            onBuild={(n) => void m.sendRaw(`$build ${n}`)}
            onRefresh={m.refreshKakeraTower}
          />
        </div>
      )}

      {section === 'collection' && <CollectionGrid store={collectionStore} />}

      {section === 'wishlist' && <CollectionGrid store={wishlistStore} />}

      {section === 'timers' && <TimersGrid m={m} />}

      {section === 'config' && m.serverConfig && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
          <p className="mb-1 font-semibold text-zinc-300">Parsed from $settings:</p>
          <ul className="space-y-0.5">
            {m.serverConfig.claimIntervalMs && <li>Claim interval: {formatDuration(m.serverConfig.claimIntervalMs)}</li>}
            {m.serverConfig.rollsPerHour !== undefined && <li>Rolls/hour: {m.serverConfig.rollsPerHour}</li>}
            {m.serverConfig.kakeraRollsShown !== undefined && <li>Kakera shown on rolls: {String(m.serverConfig.kakeraRollsShown)}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function ClaimButton({ onClaim }: { onClaim: () => Promise<ClaimResult> }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'claimed' | 'failed' | 'unknown'>('idle');
  const click = async () => {
    setStatus('sending');
    const r = await onClaim();
    setStatus(!r.ok ? 'failed' : r.result === 'claimed' ? 'claimed' : r.result === 'failed' ? 'failed' : 'unknown');
    setTimeout(() => setStatus('idle'), 2800);
  };
  const label =
    status === 'claimed'
      ? 'CLAIMED'
      : status === 'failed'
        ? 'FAILED'
        : status === 'unknown'
          ? 'SENT — CHECK'
          : status === 'sending'
            ? 'CLAIMING…'
            : 'CLAIM';
  return (
    <button
      type="button"
      onClick={() => void click()}
      title="Claim the latest roll"
      className={cn(
        'flex w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border text-center transition-colors active:scale-[0.98]',
        status === 'claimed'
          ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-200'
          : status === 'failed'
            ? 'border-red-500/70 bg-red-500/20 text-red-200'
            : status === 'unknown'
              ? 'border-zinc-600 bg-zinc-800 text-zinc-200'
              : 'border-rose-500/60 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25',
      )}
    >
      <Heart className={cn('h-8 w-8', status === 'sending' && 'animate-pulse')} />
      <span className="text-base font-bold tracking-wide">{label}</span>
    </button>
  );
}

function RollStats({ m }: { m: UseMudae }) {
  const rolls = m.rollsRemaining;
  const claimSynced = m.cooldowns.claim !== undefined;
  const claimMs = m.remaining('claim');
  const claimResetMs = m.claimResetMs;
  return (
    <div className="flex gap-3">
      <StatChip
        icon={<Dices className="h-5 w-5 text-roll" />}
        label="Rolls"
        value={rolls === null ? null : rolls === 0 ? `0 · ${formatDuration(m.rollsResetMs)}` : `${rolls}`}
        tone={rolls === 0 ? 'warn' : 'normal'}
        onClick={m.refreshRolls}
      />
      <StatChip
        icon={<Heart className="h-5 w-5 text-rose-400" />}
        label="Claims"
        value={
          !claimSynced
            ? null
            : claimMs > 0
              ? formatDuration(claimMs)
              : claimResetMs > 0
                ? `ready · ${formatDuration(claimResetMs)}`
                : 'ready'
        }
        tone={!claimSynced ? 'normal' : claimMs <= 0 ? 'ok' : 'warn'}
        onClick={m.refreshClaim}
      />
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  tone: 'ok' | 'warn' | 'normal';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-emerald-600/50 bg-emerald-500/10'
      : tone === 'warn'
        ? 'border-amber-600/40 bg-amber-500/10'
        : 'border-zinc-700 bg-zinc-900/50';
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to refresh"
      className={cn('flex flex-1 items-center justify-between rounded-lg border px-4 py-2 text-left hover:brightness-125', toneClass)}
    >
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
          {value === null ? (
            <div className="text-sm text-zinc-400">click to reload</div>
          ) : (
            <div className="font-mono text-lg font-bold text-zinc-100">{value}</div>
          )}
        </div>
      </div>
      <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
    </button>
  );
}

const TIMER_KEYS: CooldownKey[] = ['claim', 'rolls', 'power', 'daily', 'dk', 'vote'];

function TimersGrid({ m }: { m: UseMudae }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
        <span>Click $tu to sync these from Discord.</span>
        {m.ocrBusy && <span className="text-roll">reading…</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TIMER_KEYS.map((key) => {
          const remMs = m.remaining(key);
          const ready = remMs <= 0;
          const tracked = m.cooldowns[key] !== undefined;
          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-3',
                !tracked
                  ? 'border-zinc-800 bg-zinc-900/40'
                  : ready
                    ? 'border-emerald-600/50 bg-emerald-500/10'
                    : 'border-amber-600/40 bg-amber-500/10',
              )}
            >
              <div className="font-mono text-sm font-semibold text-zinc-200">{COOLDOWNS[key].label}</div>
              <div
                className={cn(
                  'text-lg font-bold',
                  !tracked ? 'text-zinc-600' : ready ? 'text-emerald-300' : 'text-amber-300',
                )}
              >
                {!tracked ? '—' : ready ? 'ready' : formatDuration(remMs)}
              </div>
              <div className="text-[11px] text-zinc-500">{COOLDOWNS[key].note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
