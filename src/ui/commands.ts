import type { PrefixMode } from '../shared/types';
import type { CooldownKey } from './cooldowns';

// Each section maps to a tab in the hamburger drawer — "a menu for each part of the game".
export type CommandSection =
  | 'roll'
  | 'timers'
  | 'collection'
  | 'kakera'
  | 'wishlist'
  | 'trade'
  | 'config';

export interface MudaeCommand {
  id: string;
  label: string;
  /** Command body without the prefix, e.g. "wa", "daily", "dk". */
  base: string;
  description: string;
  section: CommandSection;
  /** Roll-style commands have a `/wa` slash equivalent; utilities do not. */
  slashable?: boolean;
  /** Starts/relates to a tracked cooldown timer when pressed. */
  cooldownKey?: CooldownKey;
  /** Bigger, highlighted buttons for the spammy core-loop commands. */
  primary?: boolean;
  /** Command expects arguments (e.g. $give <char>) — use the free-form input. */
  needsArgs?: boolean;
}

/**
 * Resolve the literal text to send for a command, honoring the prefix mode.
 * Slash form only applies to roll commands; Mudae's utility slash commands are
 * namespaced differently (e.g. /kakera dailyk), so utilities always use `$`.
 */
export function resolveCommandText(cmd: MudaeCommand, mode: PrefixMode): string {
  if (mode === 'slash' && cmd.slashable) return `/${cmd.base}`;
  return `$${cmd.base}`;
}

export const COMMANDS: MudaeCommand[] = [
  // --- Roll (core loop) ---
  { id: 'wa', label: '$wa', base: 'wa', description: 'Roll a waifu (animanga)', section: 'roll', slashable: true, primary: true },
  { id: 'ha', label: '$ha', base: 'ha', description: 'Roll a husbando (animanga)', section: 'roll', slashable: true, primary: true },
  { id: 'wg', label: '$wg', base: 'wg', description: 'Roll a waifu (games)', section: 'roll', slashable: true },
  { id: 'hg', label: '$hg', base: 'hg', description: 'Roll a husbando (games)', section: 'roll', slashable: true },
  { id: 'w', label: '$w', base: 'w', description: 'Roll a waifu (animanga + games)', section: 'roll', slashable: true },
  { id: 'h', label: '$h', base: 'h', description: 'Roll a husbando (animanga + games)', section: 'roll', slashable: true },
  { id: 'ma', label: '$ma', base: 'ma', description: 'Roll any gender (animanga)', section: 'roll', slashable: true },
  { id: 'mg', label: '$mg', base: 'mg', description: 'Roll any gender (games)', section: 'roll', slashable: true },
  { id: 'm', label: '$m', base: 'm', description: 'Roll any gender (animanga + games)', section: 'roll', slashable: true },
  { id: 'mx', label: '$mx', base: 'mx', description: 'Roll any gender, fully random', section: 'roll', slashable: true },

  // --- Timers / status ---
  { id: 'tu', label: '$tu', base: 'tu', description: 'Timer dashboard — all cooldowns at a glance', section: 'timers', primary: true },
  { id: 'daily', label: '$daily', base: 'daily', description: 'Daily reward + free rolls reset (20h)', section: 'timers', cooldownKey: 'daily' },
  { id: 'vote', label: '$vote', base: 'vote', description: 'Vote on top.gg for roll resets (~12h)', section: 'timers', cooldownKey: 'vote' },
  { id: 'rt', label: '$rt', base: 'rt', description: 'Reset your claim timer (badge-gated)', section: 'timers' },
  { id: 'freeclaim', label: '$freeclaim', base: 'freeclaim', description: 'Reset current claim timer (1 / 3h)', section: 'timers' },
  { id: 'ru', label: '$ru', base: 'ru', description: 'Time until rolls refresh', section: 'timers' },
  { id: 'mu', label: '$mu', base: 'mu', description: 'Time until you can claim again', section: 'timers' },
  { id: 'rolls', label: '$rolls', base: 'rolls', description: 'Rolls remaining this hour', section: 'timers' },

  // --- Kakera ---
  { id: 'dk', label: '$dk', base: 'dk', description: 'Daily kakera payout (20h)', section: 'kakera', cooldownKey: 'dk' },
  { id: 'k', label: '$k', base: 'k', description: 'Your kakera balance', section: 'kakera' },
  { id: 'ku', label: '$ku', base: 'ku', description: 'Kakera react power % + refill time', section: 'kakera', cooldownKey: 'power' },

  // --- Collection / harem ---
  { id: 'mm', label: '$mm', base: 'mm', description: 'Your harem (married characters)', section: 'collection' },
  { id: 'mmk', label: '$mmk', base: 'mmk', description: 'Harem sorted by kakera value', section: 'collection' },
  { id: 'mmv', label: '$mmv', base: 'mmv', description: 'Harem sorted by value', section: 'collection' },
  { id: 'mma', label: '$mma', base: 'mma', description: 'Harem — animanga only', section: 'collection' },
  { id: 'mmg', label: '$mmg', base: 'mmg', description: 'Harem — games only', section: 'collection' },
  { id: 'div', label: '$div', base: 'div', description: 'Divorce a character (kakera refund)', section: 'collection', needsArgs: true },
  { id: 'im', label: '$im', base: 'im', description: 'Character info (name)', section: 'collection', needsArgs: true },
  { id: 'sl', label: '$sl', base: 'sl', description: 'Series list', section: 'collection' },

  // --- Wishlist ---
  { id: 'wl', label: '$wl', base: 'wl', description: 'View your wishlist', section: 'wishlist' },
  { id: 'wish', label: '$wish', base: 'wish', description: 'Add a character to your wishlist (name)', section: 'wishlist', needsArgs: true },
  { id: 'wishseries', label: '$wishs', base: 'wishs', description: 'Wish a whole series (name)', section: 'wishlist', needsArgs: true },

  // --- Trade ---
  { id: 'give', label: '$give', base: 'give', description: 'Give/trade a character (@user character)', section: 'trade', needsArgs: true },
  { id: 'givekakera', label: '$givekakera', base: 'givekakera', description: 'Give kakera (@user amount)', section: 'trade', needsArgs: true },
  { id: 'marryexchange', label: '$marryexchange', base: 'marryexchange', description: 'Exchange marriages (@user)', section: 'trade', needsArgs: true },

  // --- Config (rare setup) ---
  { id: 'limroul', label: '$limroul', base: 'limroul', description: 'Limited roulette (popular characters only)', section: 'config' },
  { id: 'tuarrange', label: '$tuarrange', base: 'tuarrange', description: 'Reorder the $tu timer dashboard', section: 'config', needsArgs: true },
  { id: 'settings', label: '$settings', base: 'settings', description: 'Server Mudae settings', section: 'config' },
  { id: 'togglekakerarolls', label: '$togglekakerarolls', base: 'togglekakerarolls', description: 'Show kakera value on rolls (helps OCR)', section: 'config' },
  { id: 'toggleclaimrolls', label: '$toggleclaimrolls', base: 'toggleclaimrolls', description: 'Show Claims: #rank on rolls (helps OCR)', section: 'config' },
  { id: 'togglelikerolls', label: '$togglelikerolls', base: 'togglelikerolls', description: 'Show Likes: #rank on rolls (helps OCR)', section: 'config' },
];

export interface SectionMeta {
  title: string;
  blurb: string;
}

export const SECTION_ORDER: CommandSection[] = [
  'roll',
  'timers',
  'kakera',
  'collection',
  'wishlist',
  'trade',
  'config',
];

export const SECTION_META: Record<CommandSection, SectionMeta> = {
  roll: { title: 'Roll', blurb: 'The core loop — fire these until rolls run out.' },
  timers: { title: 'Timers', blurb: 'Status, cooldowns, and dailies.' },
  kakera: { title: 'Kakera', blurb: 'Daily kakera, balance, react power.' },
  collection: { title: 'Collection', blurb: 'Your harem, divorces, character info.' },
  wishlist: { title: 'Wishlist', blurb: 'Manage wished characters & series.' },
  trade: { title: 'Trade', blurb: 'Give characters & kakera, exchange marriages.' },
  config: { title: 'Config', blurb: 'Server settings & roll toggles.' },
};

export function commandsForSection(section: CommandSection): MudaeCommand[] {
  return COMMANDS.filter((c) => c.section === section);
}
