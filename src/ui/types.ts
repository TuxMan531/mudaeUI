import type { CooldownKey } from './cooldowns';

/** A character produced by a roll, assembled from OCR + a cropped portrait. */
export interface RolledCharacter {
  id: string;
  name: string; // best-effort (OCR of the name line)
  series: string; // best-effort (OCR of the series line)
  kakera?: number;
  claimRank?: number;
  likeRank?: number;
  claimedBy?: string; // "Belongs to <user>" → already owned
  portrait?: string; // data URL cropped from the captured frame (pixel-perfect)
  command: string; // which roll command produced it ($wa, $ha, …)
  at: number;
  rawText?: string; // full OCR text, for debugging / manual correction
  reloading?: boolean; // a $im reload is in flight (refresh button on the roll card)
  discordId?: string; // source Discord message id — lets a late imageUpdate patch this card
}

/** Remaining ms per cooldown parsed from a $tu reply (undefined = unknown).
 *  `claimReset` is the periodic claim-window reset countdown, shown even when claim is ready. */
export type TuTimers = Partial<Record<CooldownKey, number>> & { capturedAt: number; claimReset?: number };

/** A character in YOUR collection, hydrated on demand via $im <name>. */
export interface CollectedCharacter {
  id: string; // normalized (lowercased, trimmed) name — the key
  name: string; // display name
  category?: string; // Mudae "series" line, e.g. "Actors & Actresses" — group by this
  kakera?: number;
  claimRank?: number;
  likeRank?: number;
  keys?: number; // number of keys on the character (0/undefined = none)
  portrait?: string; // cropped character art from the $im reply
  starred?: boolean; // UI-only pin to the top (sends nothing to Discord)
  loadedAt?: number; // when $im data was captured; undefined = blank "load" card
  loading?: boolean; // a load/reload is in flight
}

/** A lightweight, persistent log entry (no screenshot) for the History tab. */
export interface HistoryEntry {
  id: string;
  name: string;
  category?: string;
  claimRank?: number;
  likeRank?: number;
  kakera?: number;
  at: number;
  claimed?: boolean;
}

/** A kakera "power badge" upgrade parsed from $k. */
export interface KakeraBadge {
  name: string; // "Bronze"
  level: number; // 0–4
  nextCost: number;
  benefit: string;
  buyCmd: string; // "$bronze"
}

/** The kakera shop parsed from $k. */
export interface KakeraShop {
  balance?: number;
  badges: KakeraBadge[];
  capturedAt: number;
}

/** A single buildable perk in the kakera tower ($kt → $build <n>). */
export interface KakeraTowerPerk {
  n: number;
  text: string;
}

/** The kakera tower parsed from $kt (12-floor perk builder). */
export interface KakeraTower {
  level?: number;
  nextCost?: number;
  balance?: number;
  perks: KakeraTowerPerk[];
  capturedAt: number;
}

/** Harem summary stats parsed from a $mmv reply (Mudae's own numbers). */
export interface CollectionStats {
  avgKakera?: number; // Mudae's "AVG:" — average character value
  top15Value?: number; // Mudae's "Top 15 value:"
  capturedAt: number;
}

/** Server config parsed from a $settings reply; tunes durations + expected fields. */
export interface ServerConfig {
  claimIntervalMs?: number;
  rollsPerHour?: number;
  kakeraRollsShown?: boolean;
  claimRollsShown?: boolean;
  likeRollsShown?: boolean;
  capturedAt: number;
}
