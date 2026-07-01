import {
  Dices,
  Clock,
  Gem,
  Heart,
  Star,
  ArrowLeftRight,
  SlidersHorizontal,
  Settings as SettingsIcon,
  ScrollText,
  X,
} from 'lucide-react';
import { SECTION_META, SECTION_ORDER, type CommandSection } from '../commands';
import { cn } from '../lib/utils';

export type View = CommandSection | 'settings' | 'history';

const SECTION_ICON: Record<CommandSection, React.ComponentType<{ className?: string }>> = {
  roll: Dices,
  timers: Clock,
  kakera: Gem,
  collection: Heart,
  wishlist: Star,
  trade: ArrowLeftRight,
  config: SlidersHorizontal,
};

interface Props {
  open: boolean;
  view: View;
  onSelect: (view: View) => void;
  onClose: () => void;
}

export function Sidebar({ open, view, onSelect, onClose }: Props) {
  if (!open) return null;

  const items: { key: View; label: string; blurb?: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    ...SECTION_ORDER.map((s) => ({ key: s as View, label: SECTION_META[s].title, blurb: SECTION_META[s].blurb, Icon: SECTION_ICON[s] })),
    { key: 'history' as View, label: 'History', blurb: 'Past rolls & claims', Icon: ScrollText },
    { key: 'settings' as View, label: 'Settings', Icon: SettingsIcon },
  ];

  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/50" onClick={onClose} />
      <nav className="absolute inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="text-sm font-semibold text-zinc-200">Menu</span>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {items.map(({ key, label, blurb, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelect(key);
                onClose();
              }}
              className={cn(
                'mb-1 flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                view === key ? 'bg-roll/20 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800',
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                {blurb && <span className="block truncate text-[11px] text-zinc-500">{blurb}</span>}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
