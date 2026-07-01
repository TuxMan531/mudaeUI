import type { CooldownKey } from './cooldowns';
import type { KakeraBadge, ServerConfig, TuTimers } from './types';

/**
 * Parse a Mudae-style duration from a line: "2h 13", "2h 13 min", "45 min", "1h".
 * Returns milliseconds, or undefined if no duration is present.
 */
export function parseDurationMs(s: string): number | undefined {
  const hm = s.match(/(\d+)\s*h(?:our)?s?\s*(\d+)?/i);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    return (h * 60 + m) * 60_000;
  }
  const mm = s.match(/(\d+)\s*m(?:in)?\b/i);
  if (mm) return parseInt(mm[1], 10) * 60_000;
  return undefined;
}

const READY_WORDS = /(ready|available|can\s|now\b|reset)/i;

/**
 * Parse the $tu timer dashboard into remaining-ms per cooldown.
 * Best-effort: matches a keyword per line, then a duration; "ready/available/can"
 * with no duration → 0 (available now). Lines are very OCR-noise tolerant.
 */
export function parseTu(text: string): TuTimers {
  const timers: TuTimers = { capturedAt: Date.now() };
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const assign = (key: CooldownKey, line: string) => {
    const dur = parseDurationMs(line);
    if (dur !== undefined) timers[key] = dur;
    else if (READY_WORDS.test(line)) timers[key] = 0;
  };

  for (const line of lines) {
    const l = line.toLowerCase();
    if (/claim/.test(l) && !/like/.test(l)) {
      // "you can claim right now!" → ready, even though the line also mentions the
      // next reset duration ("...next claim reset is in 1h 58min").
      if (/(right now|available now|claim now)/.test(l)) timers.claim = 0;
      else assign('claim', line);
    }
    if (/roll/.test(l)) assign('rolls', line);
    if (/daily/.test(l)) assign('daily', line);
    if (/(power|react)/.test(l)) assign('power', line);
    if (/\bdk\b|kakera daily|daily kakera/.test(l)) assign('dk', line);
    if (/vote/.test(l)) assign('vote', line);
  }
  // "next claim reset is in 12 min" — the periodic claim-window reset; shown even when you
  // can claim right now (so it's tracked separately from claim availability).
  const resetM = text.match(/claim reset(?:\s+is)?\s+in\s+([^\n.!]+)/i);
  if (resetM) {
    const d = parseDurationMs(resetM[1]);
    if (d !== undefined) timers.claimReset = d;
  }
  return timers;
}

export interface ParsedRoll {
  name?: string;
  series?: string;
  kakera?: number;
  claimRank?: number;
  likeRank?: number;
  claimedBy?: string;
}

const RANK_CLAIM = /claims?\s*(?:rank)?\s*[:#]*\s*#?\s*([\d,]+)/i;
const RANK_LIKE = /likes?\s*(?:rank)?\s*[:#]*\s*#?\s*([\d,]+)/i;
const BELONGS = /belongs?\s+to\s+([^\n]+)/i;

const toInt = (s: string) => parseInt(s.replace(/[,\s]/g, ''), 10);

/**
 * Kakera value. Mudae shows it as "<X> roulette · <kakera>" (on $im) or a bold
 * number next to the kakera gem (on rolls). Prefer the roulette line; otherwise take
 * a standalone number on a line with no "#rank"/time, so we never read rank digits
 * (e.g. the "844" inside "Claim Rank: #2,844").
 */
export function extractKakera(text: string): number | undefined {
  const lines = text.split(/\r?\n/);
  // $im: "<X> roulette · <kakera>"
  const roul = text.match(/roulette[^\d]{0,5}(\d{1,5})/i);
  if (roul) return toInt(roul[1]);
  // Rolls: kakera is on the line right after "Likes: #N", before "React…". Take the
  // FIRST numeric token so a space-separated gem digit (OCR of the gem, e.g. "38 4")
  // is dropped rather than appended.
  const likesIdx = lines.findIndex((l) => /likes?\s*(?:rank)?\s*[:#]/i.test(l));
  if (likesIdx >= 0) {
    for (let i = likesIdx + 1; i < Math.min(lines.length, likesIdx + 3); i++) {
      if (/#|claim|like|rank/i.test(lines[i])) continue;
      const m = lines[i].match(/(\d{1,4})/);
      if (m) return toInt(m[1]);
    }
  }
  // Fallback: first standalone number not on a rank/time line.
  for (const line of lines) {
    if (/#|claim|like|rank|\d{1,2}:\d{2}/i.test(line)) continue;
    const ka = line.match(/\b(\d{2,5})\b/);
    if (ka) return toInt(ka[1]);
  }
  return undefined;
}

/**
 * Best-effort parse of a roll message. Names/series are noisy (OCR of proper nouns);
 * the cropped portrait is the source of truth. Ranks/kakera are digits and reliable.
 */
export function parseRoll(text: string): ParsedRoll {
  const out: ParsedRoll = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const claim = text.match(RANK_CLAIM);
  if (claim) out.claimRank = toInt(claim[1]);
  const like = text.match(RANK_LIKE);
  if (like) out.likeRank = toInt(like[1]);
  const belongs = text.match(BELONGS);
  if (belongs) out.claimedBy = belongs[1].trim();

  out.kakera = extractKakera(text);

  // Roll embed: Name / Category / Claims: #N / Likes: #N / <kakera> / "React…".
  // Anchor on the "Claims:" line — category is the line above it, name two above.
  // This is robust even when leading lines are noisy, unlike "first two lines".
  const cleanName = (l: string) =>
    l.replace(/[♂♀⚥⚧]/gu, '').replace(/[^\p{L}\p{N} &'.!:-]/gu, '').replace(/\s+/g, ' ').trim();
  const claimsIdx = lines.findIndex((l) => RANK_CLAIM.test(l));
  if (claimsIdx >= 1 && !/roulette/i.test(lines[claimsIdx - 1])) {
    const cat = cleanName(lines[claimsIdx - 1]);
    if (cat.length >= 2) out.series = cat;
    if (claimsIdx >= 2) {
      const nm = cleanName(lines[claimsIdx - 2]);
      if (nm.length >= 2) out.name = nm;
    }
  }

  // Fallback: first two text-ish lines (skip metadata / channel / system noise).
  if (!out.name || !out.series) {
    const SYSTEM_NOISE = /you can|limited to|react to kakera|right now|roulette|left this hour|\$\w+\)/i;
    const isMeta = (l: string) =>
      RANK_CLAIM.test(l) ||
      RANK_LIKE.test(l) ||
      BELONGS.test(l) ||
      /^\W*#/.test(l) ||
      SYSTEM_NOISE.test(l) ||
      /^\W*\d[\d\s]*\W*$/.test(l);
    const textLines = lines.filter((l) => !isMeta(l) && l.replace(/\W/g, '').length >= 2);
    if (!out.name && textLines[0]) out.name = textLines[0];
    if (!out.series && textLines[1]) out.series = textLines[1];
  }

  return out;
}

/**
 * Best-effort extraction of character names from a $mm (harem) reply.
 * Harem lines look roughly like "N・Name - Series ❤123". We take the chunk between
 * a leading number/bullet and the first " - " / "(" separator. Very noisy (OCR of a
 * list) — intended to seed blank cards the user can then $im-load and correct.
 */
export function parseHaremNames(text: string): string[] {
  const names: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (line.length < 3) continue;
    // strip a leading index/bullet like "12・", "3.", "•"
    line = line.replace(/^[\s\d.()|•・·*#>-]+/, '').trim();
    // name ends at a series/kakera separator
    const name = line.split(/\s+[-–—(|]\s*|\s{2,}/)[0].trim();
    const clean = name.replace(/[^\p{L}\p{N} .'’!-]/gu, '').trim();
    if (clean.length >= 2 && /\p{L}/u.test(clean) && !/^you\b|claim|kakera|page/i.test(clean)) {
      names.push(clean);
    }
  }
  // de-dupe (case-insensitive), cap to avoid junk floods
  const seen = new Set<string>();
  return names.filter((n) => (seen.has(n.toLowerCase()) ? false : (seen.add(n.toLowerCase()), true))).slice(0, 40);
}

export interface ImStats {
  kakera?: number;
  claimRank?: number;
  likeRank?: number;
  /** The Mudae "series" line, e.g. "Actors & Actresses" — used as the category. */
  category?: string;
  /** Number of keys on the character (from "· <key> (N)" on the roulette line). */
  keys?: number;
}

/**
 * Stats from an $im reply. Uses the LAST occurrence of each pattern, because the
 * freshest reply sits at the bottom of the captured region (stacked older replies
 * appear above). The character's name is supplied by the user, so we don't OCR it.
 *
 * $im layout:  Name / Category ♂ / "<X> roulette · <kakera>" / Claim Rank: #N /
 *              Like Rank: #N / <full name> / [image] / Belongs to <user> · page.
 */
export function parseImStats(text: string): ImStats {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lastInt = (re: RegExp): number | undefined => {
    const ms = [...text.matchAll(re)];
    return ms.length ? toInt(ms[ms.length - 1][1]) : undefined;
  };

  const out: ImStats = {
    claimRank: lastInt(/claims?\s*(?:rank)?\s*[:#]*\s*#?\s*([\d,]+)/gi),
    likeRank: lastInt(/likes?\s*(?:rank)?\s*[:#]*\s*#?\s*([\d,]+)/gi),
  };

  const clean = (l: string) => l.replace(/[♂♀⚥⚧]/gu, '').replace(/[^\p{L}\p{N} &'.!-]/gu, '').trim();
  const valid = (c: string) => c.length >= 2 && !/rank|belongs|claim|like|roulette/i.test(c);

  // kakera, keys, and category all hang off the "<X> roulette · <kakera> · <key>(N)"
  // line. kakera comes ONLY from here — never the "Ugly Squid (+20)" badge line — so a
  // clipped roulette line yields undefined kakera rather than a wrong badge number.
  // Use the LAST roulette line (newest reply sits at the bottom).
  let rIdx = -1;
  lines.forEach((l, i) => {
    if (/roulette/i.test(l)) rIdx = i;
  });
  if (rIdx >= 0) {
    const rl = lines[rIdx];
    const km = rl.match(/roulette[^\d]{0,8}(\d{1,4})/i);
    if (km) out.kakera = toInt(km[1]);
    const keyM = rl.match(/\((\d+)\)/); // "· <key> (N)"
    if (keyM) out.keys = parseInt(keyM[1], 10);
    if (rIdx > 0) {
      const cat = clean(lines[rIdx - 1]);
      if (valid(cat)) out.category = cat;
    }
  }
  // Fallback (roulette line clipped/misread): $im layout is Name / Category /
  // roulette / Claims — so the category is two lines above "Claims:".
  if (!out.category) {
    const cIdx = lines.findIndex((l) => /claims?\s*(?:rank)?\s*[:#]/i.test(l));
    if (cIdx >= 2) {
      const cat = clean(lines[cIdx - 2]);
      if (valid(cat)) out.category = cat;
    }
  }
  return out;
}

const BADGE_NAMES = /\b(Bronze|Silver|Gold|Sapphire|Ruby|Diamond|Emerald|Amethyst|Onyx)\b/i;
const ROMAN: Record<string, number> = { '0': 0, I: 1, II: 2, III: 3, IV: 4, V: 5 };

/** Parse $k into balance + power-badge upgrades (name, level, next-level cost, benefit). */
export function parseKakeraShop(text: string): { balance?: number; badges: KakeraBadge[] } {
  const out: { balance?: number; badges: KakeraBadge[] } = { badges: [] };
  const bal = text.match(/you have\s*([\d,]+)/i);
  if (bal) out.balance = toInt(bal[1]);

  for (const line of text.split(/\r?\n/)) {
    const nameM = line.match(BADGE_NAMES);
    const costM = line.match(/next level:?\s*([\d,]+)/i);
    if (!nameM || !costM || /prerequisite/i.test(line)) continue;
    const raw = nameM[1];
    const name = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
    const after = line.slice((nameM.index ?? 0) + raw.length).trimStart();
    const lvlM = after.match(/^(0|IV|III|II|I|V)\b/i);
    const level = lvlM ? ROMAN[lvlM[1].toUpperCase()] ?? 0 : 0;
    const tail = line.slice((costM.index ?? 0) + costM[0].length);
    // Drop leading gem glyphs / stray digits before the benefit text ("+1…", "-10%…").
    const benefit = tail.replace(/^[^a-zA-Z+%-]*/, '').trim();
    out.badges.push({ name, level, nextCost: toInt(costM[1]), benefit, buyCmd: `$${name.toLowerCase()}` });
  }
  return out;
}

/** Parse $kt (kakera tower) → current level, next-floor cost, balance, and the perk list. */
export function parseKakeraTower(
  text: string,
): { level?: number; nextCost?: number; balance?: number; perks: { n: number; text: string }[] } {
  const out: { level?: number; nextCost?: number; balance?: number; perks: { n: number; text: string }[] } = { perks: [] };
  const lvl = text.match(/current level is\s*([\d,]+)/i);
  if (lvl) out.level = toInt(lvl[1]);
  const cost = text.match(/next level costs?\s*([\d,]+)/i);
  if (cost) out.nextCost = toInt(cost[1]);
  const bal = text.match(/you have\s*([\d,]+)/i);
  if (bal) out.balance = toInt(bal[1]);
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*\[(\d+)\]\s*(.+)$/);
    if (m) out.perks.push({ n: parseInt(m[1], 10), text: m[2].trim() });
  }
  return out;
}

export interface EmbedCharacter {
  name: string;
  category?: string;
  kakera?: number;
  claimRank?: number;
  likeRank?: number;
  claimedBy?: string;
  keys?: number;
}

/**
 * Parse a Mudae roll/$im embed read from the DOM into a character. Works for both:
 * rolls (category = first description line, kakera after Likes) and $im (category above
 * the "roulette" line, kakera from it, keys). Reuses parseImStats + extractKakera on the
 * clean embed lines — no OCR noise.
 */
export function parseEmbedCharacter(embed: { author: string; description: string[]; footer: string }): EmbedCharacter {
  const text = embed.description.join('\n');
  const stats = parseImStats(text);
  const firstLine = embed.description[0]
    ? embed.description[0].replace(/[♂♀⚥⚧]/gu, '').replace(/[^\p{L}\p{N} &'.!-]/gu, '').trim()
    : undefined;
  const out: EmbedCharacter = {
    name: embed.author.trim(),
    category: stats.category ?? (firstLine && firstLine.length >= 2 ? firstLine : undefined),
    kakera: stats.kakera ?? extractKakera(text),
    claimRank: stats.claimRank,
    likeRank: stats.likeRank,
    keys: stats.keys,
  };
  const belongs = embed.footer.match(/belongs?\s+to\s+(.+)/i);
  if (belongs) out.claimedBy = belongs[1].trim();
  return out;
}

/** Parse $mmv (harem value summary) → Mudae's own AVG + Top 15 value. */
export function parseHaremStats(text: string): { avgKakera?: number; top15Value?: number } {
  const out: { avgKakera?: number; top15Value?: number } = {};
  const top = text.match(/top\s*15\s*value\s*:?\s*([\d,]+)/i);
  if (top) out.top15Value = toInt(top[1]);
  const avg = text.match(/\bavg\s*:?\s*([\d,]+)/i);
  if (avg) out.avgKakera = toInt(avg[1]);
  return out;
}

/** Read the message after a claim attempt → did it land? */
export function parseClaimResult(text: string): 'claimed' | 'failed' | 'unknown' {
  const t = text.toLowerCase();
  if (/are now married|now married|is now yours|congratulations|married!/.test(t)) return 'claimed';
  if (/can.?t claim|cannot claim|too late|already (married|claimed)|no longer available/.test(t)) return 'failed';
  return 'unknown';
}

/** Parse $ru / $rolls → rolls remaining and/or time until they reset. */
export function parseRolls(text: string): { remaining?: number; resetMs?: number } {
  const out: { remaining?: number; resetMs?: number } = {};
  const rem = text.match(/(\d+)\s*rolls?\s*(?:left|remaining)/i) ?? text.match(/have\s*(\d+)\s*rolls?/i);
  if (rem) out.remaining = parseInt(rem[1], 10);
  const resetLine = text
    .split(/\r?\n/)
    .find((l) => /roll/i.test(l) && /(reset|refresh|next)/i.test(l));
  const dur = parseDurationMs(resetLine ?? (/reset|refresh/i.test(text) ? text : ''));
  if (dur !== undefined) out.resetMs = dur;
  return out;
}

/** Parse a "Page 1/3" indicator → { current, total }. Mudae shows this in the $mm/$wl
 *  footer. A single-page list has NO indicator → returns null (so callers fetch one page). */
export function parsePageInfo(text: string): { current: number; total: number } | null {
  const ok = (cur: number, total: number, max: number) =>
    total >= 1 && total <= max && cur >= 1 && cur <= total ? { current: cur, total } : null;
  // Preferred: an explicit "Page N/M".
  const m = text.match(/page\s*(\d+)\s*\/\s*(\d+)/i);
  if (m) {
    const r = ok(parseInt(m[1], 10), parseInt(m[2], 10), 99);
    if (r) return r;
  }
  // Fallback: a bare "N/M" — but not part of a date (N/M/Y) and small, so character
  // names / stats / dates can't be mistaken for a page count.
  const m2 = text.match(/(?<![\d/])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])/);
  if (m2) return ok(parseInt(m2[1], 10), parseInt(m2[2], 10), 50);
  return null;
}

/** Best-effort parse of $settings → tune cooldown durations + expected fields. */
export function parseSettings(text: string): ServerConfig {
  const cfg: ServerConfig = { capturedAt: Date.now() };
  const lower = text.toLowerCase();

  const claimLine = lower.split(/\r?\n/).find((l) => /claim/.test(l) && /(reset|interval|hour|\dh)/.test(l));
  if (claimLine) {
    const dur = parseDurationMs(claimLine);
    if (dur) cfg.claimIntervalMs = dur;
  }

  const rollsLine = lower.split(/\r?\n/).find((l) => /rolls?\s*(per|\/)\s*hour|max\s*rolls/.test(l));
  if (rollsLine) {
    const n = rollsLine.match(/(\d+)/);
    if (n) cfg.rollsPerHour = parseInt(n[1], 10);
  }

  const toggleState = (keyword: RegExp): boolean | undefined => {
    const line = lower.split(/\r?\n/).find((l) => keyword.test(l));
    if (!line) return undefined;
    if (/(enabled|on\b|yes|shown)/.test(line)) return true;
    if (/(disabled|off\b|no\b|hidden)/.test(line)) return false;
    return undefined;
  };
  cfg.kakeraRollsShown = toggleState(/kakera.*roll|roll.*kakera/);
  cfg.claimRollsShown = toggleState(/claim.*roll|roll.*claim/);
  cfg.likeRollsShown = toggleState(/like.*roll|roll.*like/);

  return cfg;
}
