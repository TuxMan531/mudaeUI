// Mudae cooldowns. Durations are Mudae's defaults and are server-configurable
// (admins change them via $settings), so they're exposed/overridable later.

export type CooldownKey = 'claim' | 'rolls' | 'power' | 'daily' | 'dk' | 'vote';

export interface CooldownDef {
  key: CooldownKey;
  label: string;
  /** Default duration in milliseconds. */
  durationMs: number;
  note: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

export const COOLDOWNS: Record<CooldownKey, CooldownDef> = {
  claim: { key: 'claim', label: 'Claim', durationMs: 3 * HOUR, note: 'Marry a character (react on the roll).' },
  rolls: { key: 'rolls', label: 'Rolls', durationMs: 1 * HOUR, note: 'Roll pool refreshes hourly.' },
  power: { key: 'power', label: 'Kakera power', durationMs: 5 * HOUR, note: 'React power fully regenerates in ~5h.' },
  daily: { key: 'daily', label: '$daily', durationMs: 20 * HOUR, note: 'Daily reward + free rolls reset.' },
  dk: { key: 'dk', label: '$dk', durationMs: 20 * HOUR, note: 'Daily kakera payout.' },
  vote: { key: 'vote', label: '$vote', durationMs: 12 * HOUR, note: 'Vote on top.gg for roll resets.' },
};
