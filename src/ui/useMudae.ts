import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings, SendResult } from '../shared/types';
import type { CooldownKey } from './cooldowns';
import { COOLDOWNS } from './cooldowns';
import { COMMANDS, resolveCommandText, type MudaeCommand } from './commands';
import type { CollectedCharacter, CollectionStats, HistoryEntry, KakeraShop, KakeraTower, RolledCharacter, ServerConfig, TuTimers } from './types';
import { discordHub } from './discord/discordHub';
import type { DiscordMessage } from './discord/useDiscordBridge';
import {
  parseClaimResult,
  parseEmbedCharacter,
  parseHaremNames,
  parseHaremStats,
  parseKakeraShop,
  parseKakeraTower,
  parsePageInfo,
  parseRolls,
  parseTu,
  type EmbedCharacter,
} from './parsers';

export type ClaimResult = { ok: boolean; result?: 'claimed' | 'failed' | 'unknown'; error?: string };

const COLLECTION_STORAGE_KEY = 'mudae.collection.v1';
const WISHLIST_STORAGE_KEY = 'mudae.wishlist.v1';
const HISTORY_STORAGE_KEY = 'mudae.history.v1';
const ROLLED_STORAGE_KEY = 'mudae.rolledhistory.v1';
const normalizeName = (name: string) => name.trim().toLowerCase();

function loadRolled(): RolledCharacter[] {
  try {
    return JSON.parse(localStorage.getItem(ROLLED_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function loadStore(key: string): CollectedCharacter[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Mark the newest (top) history entry as claimed — a claim follows the latest roll. */
function markLatestClaimed(history: HistoryEntry[]): HistoryEntry[] {
  if (!history.length) return history;
  const [first, ...rest] = history;
  return [{ ...first, claimed: true }, ...rest];
}

/** All readable text of a Mudae message — content + embed author/description/footer — so
 *  classifiers (and pagination) don't miss text that lives in an embed or its footer
 *  (e.g. "Page 1/N", which Mudae puts in the harem embed's footer). */
function msgText(m: DiscordMessage): string {
  return [m.content, m.embed?.author, ...(m.embed?.description ?? []), m.embed?.footer]
    .filter(Boolean)
    .join('\n');
}

/** Count of distinct $tu timer signals present — used to tell the multi-line $tu
 *  dashboard apart from a single-timer reply like $ru ("you have N rolls left"). */
function tuSignalCount(text: string): number {
  return (
    (/claim/i.test(text) ? 1 : 0) +
    (/rolls?\b/i.test(text) ? 1 : 0) +
    (/daily/i.test(text) ? 1 : 0) +
    (/\bdk\b|kakera/i.test(text) ? 1 : 0) +
    (/vote/i.test(text) ? 1 : 0) +
    (/power|react/i.test(text) ? 1 : 0)
  );
}


export interface LogEntry {
  id: number;
  text: string;
  ok: boolean;
  error?: string;
  at: number;
}

type CooldownState = Partial<Record<CooldownKey, number>>;

let logSeq = 0;
let rollSeq = 0;

export function useMudae() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  // In-memory only (no localStorage): $tu-synced timers survive tab switches but reset
  // when the app closes — a stale cooldown from a previous session would be misleading.
  const [cooldowns, setCooldowns] = useState<CooldownState>({});
  const [durationOverrides] = useState<Partial<Record<CooldownKey, number>>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [rolledHistory, setRolledHistory] = useState<RolledCharacter[]>(loadRolled);
  const [serverConfig] = useState<ServerConfig | null>(null);
  const [collection, setCollection] = useState<CollectedCharacter[]>(() => loadStore(COLLECTION_STORAGE_KEY));
  const [wishlist, setWishlist] = useState<CollectedCharacter[]>(() => loadStore(WISHLIST_STORAGE_KEY));
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [kakeraShop, setKakeraShop] = useState<KakeraShop | null>(null);
  const [kakeraTower, setKakeraTower] = useState<KakeraTower | null>(null);
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [rollsRemaining, setRollsRemaining] = useState<number | null>(null);
  const [rollsResetAt, setRollsResetAt] = useState<number | null>(null);
  const [claimResetAt, setClaimResetAt] = useState<number | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  // FIFO command queue: each task is send → wait → OCR → apply, run one at a time so a
  // capture never lands on the wrong reply. High-priority tasks (claim) jump the queue.
  const queueRef = useRef<Array<() => Promise<void>>>([]);
  const processingRef = useRef(false);
  // Discord message ids the router has already handled — guards against processing the
  // same message twice (content-script re-emit, or a retry making Mudae reply again).
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.mudae.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(ROLLED_STORAGE_KEY, JSON.stringify(rolledHistory));
  }, [rolledHistory]);

  const cooldownDuration = useCallback(
    (key: CooldownKey) => durationOverrides[key] ?? COOLDOWNS[key].durationMs,
    [durationOverrides],
  );

  // --- Apply parsed Mudae data to state ---
  const applyTimers = useCallback((timers: TuTimers) => {
    setCooldowns((prev) => {
      const next = { ...prev };
      (Object.keys(timers) as (keyof TuTimers)[]).forEach((k) => {
        if (k === 'capturedAt' || k === 'claimReset') return;
        const ms = timers[k];
        if (ms === undefined) return;
        next[k as CooldownKey] = Date.now() + ms; // ms === 0 → ready now
      });
      return next;
    });
    if (timers.claimReset !== undefined) setClaimResetAt(Date.now() + timers.claimReset);
  }, []);

  const recordRoll = useCallback((ch: EmbedCharacter, image?: string, discordId?: string) => {
    const id = `roll-${++rollSeq}`;
    const rc: RolledCharacter = {
      id,
      name: ch.name || '(unknown)',
      series: ch.category ?? '',
      kakera: ch.kakera,
      claimRank: ch.claimRank,
      likeRank: ch.likeRank,
      claimedBy: ch.claimedBy,
      portrait: image,
      discordId,
      command: '$roll',
      at: Date.now(),
    };
    setRolledHistory((prev) => [rc, ...prev].slice(0, 50));
    setHistory((prev) =>
      [
        { id, name: rc.name, category: ch.category, claimRank: ch.claimRank, likeRank: ch.likeRank, kakera: ch.kakera, at: rc.at, claimed: false },
        ...prev,
      ].slice(0, 1000),
    );
  }, []);

  // Passive router: every incoming Mudae message (app- OR manually-triggered in the
  // panel) updates app state. $im embeds (have a "roulette" line) are handled by the
  // sendAndAwait paths instead, so they're skipped here.
  const routeMessage = useCallback(
    (m: DiscordMessage) => {
      // Late-resolved roll art: the message emitted first (stats now), the image follows.
      if (m.type === 'imageUpdate') {
        if (m.id && m.image) {
          const img = m.image;
          setRolledHistory((prev) =>
            prev.map((r) => (r.discordId === m.id && !r.portrait ? { ...r, portrait: img } : r)),
          );
        }
        return;
      }
      if (m.type !== 'message') return;
      // Dedupe: never process the same Discord message twice (re-emit / retry double).
      if (m.id) {
        if (processedIds.current.has(m.id)) return;
        processedIds.current.add(m.id);
        if (processedIds.current.size > 600) {
          processedIds.current = new Set([...processedIds.current].slice(-300));
        }
      }
      const text = msgText(m);
      const descText = m.embed?.description?.join('\n') ?? '';

      // Claim confirmation — often a grouped/avatar-less message, so check before isMudae.
      if (/\bare now married\b|is now yours|now belongs to you/i.test(text)) {
        setHistory((prev) => markLatestClaimed(prev));
        return;
      }
      if (m.isMudae !== true) return;
      if (m.embed && /roulette/i.test(descText)) return; // $im → sendAndAwait

      // $kt — kakera tower (12-floor perk builder). Distinctive wording, so check early.
      if (/floors of the tower|build a floor/i.test(text)) {
        const kt = parseKakeraTower(text);
        if (kt.perks.length || kt.nextCost !== undefined) {
          setKakeraTower({ ...kt, capturedAt: Date.now() });
          return;
        }
      }

      // Roll embed.
      if (m.embed && m.embed.author && /claims?:\s*#|likes?:\s*#|react with any emoji/i.test(descText)) {
        recordRoll(parseEmbedCharacter(m.embed), m.embed.image || undefined, m.id);
        return;
      }
      // $mmv — harem value summary (Mudae's own AVG + Top 15 value).
      if (/top\s*15\s*value/i.test(text) || /\bavg\s*:/i.test(text)) {
        const hs = parseHaremStats(text);
        if (hs.avgKakera !== undefined || hs.top15Value !== undefined) {
          setCollectionStats({ ...hs, capturedAt: Date.now() });
          return;
        }
      }
      // $k — kakera balance + power-badge shop (badge name + "Next level"). Check before
      // $tu/$ru since the shop text also mentions kakera.
      if (/next level/i.test(text) && /bronze|silver|gold|sapphire|ruby|diamond|emerald|amethyst|onyx/i.test(text)) {
        setKakeraShop({ ...parseKakeraShop(text), capturedAt: Date.now() });
        return;
      }
      // $tu — the multi-line timer dashboard (3+ distinct timer signals). Check before $ru
      // because $tu also mentions "rolls reset".
      if (tuSignalCount(text) >= 3) {
        applyTimers(parseTu(text));
        return;
      }
      // $ru / $rolls — rolls remaining and/or reset time.
      if (/rolls?\s*(left|remaining)|you have\s*\d+\s*rolls?|rolls?\s*reset/i.test(text)) {
        const r = parseRolls(text);
        if (r.remaining !== undefined) {
          setRollsRemaining(r.remaining);
          if (r.remaining > 0) setRollsResetAt(null);
        }
        if (r.resetMs !== undefined) setRollsResetAt(Date.now() + r.resetMs);
      }
    },
    [applyTimers, recordRoll],
  );

  useEffect(() => discordHub.onMessage(routeMessage), [routeMessage]);

  const runQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setOcrBusy(true);
    try {
      while (queueRef.current.length) {
        const task = queueRef.current.shift()!;
        try {
          await task();
        } catch (err) {
          window.mudae.log(`[queue] task error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } finally {
      processingRef.current = false;
      setOcrBusy(false);
    }
  }, []);

  /** Enqueue a task. `high` priority jumps ahead of pending tasks (after the in-flight one). */
  const enqueue = useCallback(
    <T,>(fn: () => Promise<T>, priority?: 'high'): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const task = async () => {
          try {
            resolve(await fn());
          } catch (err) {
            reject(err);
          }
        };
        if (priority === 'high') queueRef.current.unshift(task);
        else queueRef.current.push(task);
        void runQueue();
      }),
    [runQueue],
  );

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await window.mudae.setSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const send = useCallback(
    (cmd: MudaeCommand): Promise<SendResult> =>
      enqueue(async () => {
        if (!settings) return { ok: false, error: 'no settings' } as SendResult;
        const text = resolveCommandText(cmd, settings.prefixMode);
        // Reliable send: the Slate paste occasionally no-ops, so resend once if Mudae
        // doesn't reply at all within 5s. Any Mudae reply means it registered; the passive
        // router classifies the reply itself.
        const reply = await discordHub.sendReliable(text);
        const ok = reply !== null;
        const err = ok ? undefined : 'no reply from Mudae (sent twice)';
        if (ok && cmd.cooldownKey) {
          const key = cmd.cooldownKey;
          setCooldowns((prev) => ({ ...prev, [key]: Date.now() + cooldownDuration(key) }));
        }
        if (ok && cmd.section === 'roll') {
          setRollsRemaining((prev) => {
            if (prev === null) return prev;
            const next = Math.max(0, prev - 1);
            if (next === 0) setRollsResetAt((r) => r ?? Date.now() + COOLDOWNS.rolls.durationMs);
            return next;
          });
        }
        setLog((prev) =>
          [{ id: ++logSeq, text, ok, error: err, at: Date.now() }, ...prev].slice(0, 50),
        );
        // Small spacing between queued pastes to stay friendly to Discord.
        await new Promise((r) => setTimeout(r, 400));
        return { ok, error: err };
      }),
    [settings, enqueue, cooldownDuration],
  );

  /** Re-sync rolls remaining / reset time by sending $ru. */
  const refreshRolls = useCallback(() => {
    const ru = COMMANDS.find((c) => c.id === 'ru');
    if (ru) void send(ru);
  }, [send]);

  /** Claim the latest roll (sends the reaction text via the webview), then read Mudae's
   *  next message to verify whether the claim landed. High priority — jumps the queue. */
  const claim = useCallback(
    (): Promise<ClaimResult> =>
      enqueue(async () => {
        if (!settings) return { ok: false, error: 'no settings' };
        const text = settings.claimText.trim();
        if (!text) return { ok: false, error: 'No claim text set (Settings → Claim).' };
        setLog((prev) => [{ id: ++logSeq, text: `claim ${text}`, ok: true, at: Date.now() }, ...prev].slice(0, 50));
        const reply = await discordHub.sendAndAwait(
          text,
          (m) => /are now married|is now yours|too late|already (married|claimed)|can.?t? claim/i.test(m.content ?? ''),
          5000,
        );
        const result = reply ? parseClaimResult(reply.content ?? '') : 'unknown';
        window.mudae.log(`[claim] verified=${result}`);
        if (result === 'claimed') setHistory((prev) => markLatestClaimed(prev));
        return { ok: true, result };
      }, 'high'),
    [settings, enqueue],
  );

  /** Re-sync claim availability by sending $tu. */
  const refreshClaim = useCallback(() => {
    const tu = COMMANDS.find((c) => c.id === 'tu');
    if (tu) void send(tu);
  }, [send]);

  /** Re-read the kakera tower by sending $kt. */
  const refreshKakeraTower = useCallback(() => {
    const kt = COMMANDS.find((c) => c.id === 'kt');
    if (kt) void send(kt);
  }, [send]);

  /** Send a raw, free-form command string (for args like $give @user Megumin). */
  const sendRaw = useCallback(async (raw: string): Promise<SendResult> => {
    const text = raw.trim();
    if (!text) return { ok: false, error: 'empty' };
    const reply = await discordHub.sendReliable(text);
    const ok = reply !== null;
    const err = ok ? undefined : 'no reply from Mudae (sent twice)';
    setLog((prev) => [{ id: ++logSeq, text, ok, error: err, at: Date.now() }, ...prev].slice(0, 50));
    return { ok, error: err };
  }, []);

  // --- Character stores (collection + wishlist share this machinery) ---
  type Setter = React.Dispatch<React.SetStateAction<CollectedCharacter[]>>;

  const addTo = useCallback((set: Setter, name: string) => {
    const display = name.trim();
    if (!display) return;
    const id = normalizeName(display);
    set((prev) => (prev.some((c) => c.id === id) ? prev : [{ id, name: display }, ...prev]));
  }, []);

  const removeFrom = useCallback((set: Setter, id: string) => {
    set((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** UI-only pin — sends nothing to Discord. */
  const toggleStarIn = useCallback((set: Setter, id: string) => {
    set((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
  }, []);

  const mergeInto = useCallback((set: Setter, names: string[]) => {
    set((prev) => {
      const have = new Set(prev.map((c) => c.id));
      const additions: CollectedCharacter[] = [];
      for (const n of names) {
        const id = normalizeName(n);
        if (!have.has(id)) {
          have.add(id);
          additions.push({ id, name: n });
        }
      }
      return [...prev, ...additions];
    });
  }, []);

  // Await the next Mudae embed that has a "roulette" line (an $im reply). Reliable: resend
  // $im once if no reply within 5s ($im is an idempotent query, so a double is harmless).
  // The embed matches before its art finishes loading, so wait for the imageUpdate that
  // fires once Discord has actually loaded the art, then merge it into the reply.
  const awaitImReply = async (name: string): Promise<DiscordMessage | null> => {
    const reply = await discordHub.sendReliable(
      `$im ${name}`,
      (m) => m.isMudae === true && !!m.embed && /roulette/i.test(m.embed.description.join('\n')),
      5000,
      2,
    );
    if (reply?.embed && !reply.embed.image && reply.id) {
      const img = await discordHub.waitForImage(reply.id, 8000);
      if (img) reply.embed.image = img;
    }
    return reply;
  };

  /** Run $im <name> via the webview and hydrate that character in the given store. */
  const hydrateViaIm = useCallback(
    (set: Setter, name: string): Promise<void> => {
      const id = normalizeName(name);
      set((prev) => prev.map((c) => (c.id === id ? { ...c, loading: true } : c)));
      return enqueue(async () => {
        const reply = await awaitImReply(name);
        if (reply?.embed) {
          const embed = reply.embed;
          const ch = parseEmbedCharacter(embed);
          set((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    category: ch.category ?? c.category,
                    kakera: ch.kakera ?? c.kakera,
                    claimRank: ch.claimRank ?? c.claimRank,
                    likeRank: ch.likeRank ?? c.likeRank,
                    keys: ch.keys ?? c.keys,
                    portrait: embed.image || c.portrait,
                    loadedAt: Date.now(),
                    loading: false,
                  }
                : c,
            ),
          );
        } else {
          window.mudae.log(`[im] no reply for ${name}`);
          set((prev) => prev.map((c) => (c.id === id ? { ...c, loading: false } : c)));
        }
      });
    },
    [enqueue],
  );

  /** Run $<base>, read "Page 1/N", auto-fetch pages 2…N, collect every name into the store.
   *  Runs as ONE queue task so its pagination doesn't interleave with other commands. */
  const autoCollectInto = useCallback(
    (set: Setter, listBase: string): Promise<void> => {
      if (collecting) return Promise.resolve();
      setCollecting(true);
      return enqueue(async () => {
        // Pages get dropped if sent too fast — resend a page if Mudae doesn't reply within
        // the window (instead of silently skipping it and leaving a gap in the collection).
        const fetchPage = (cmd: string) =>
          discordHub.sendReliable(cmd, (m) => m.isMudae === true && !!(m.content || m.embed), 6000, 2);
        // Names come from the list body (content/description). The "Page 1/N" indicator
        // lives in the embed FOOTER — read page count from there (+content) only, NOT the
        // names: a single-page list has no indicator, and a loose scan of character names
        // can false-match an "N/M" and loop fetching pages that don't exist.
        const namesOf = (mm: DiscordMessage | null) =>
          parseHaremNames(mm ? mm.content || (mm.embed?.description.join('\n') ?? '') : '');
        const pageText = (mm: DiscordMessage | null) =>
          mm ? [mm.embed?.footer, mm.content].filter(Boolean).join('\n') : '';
        let names: string[] = [];
        const firstMsg = await fetchPage(`$${listBase}`);
        names = namesOf(firstMsg);
        const total = Math.min(parsePageInfo(pageText(firstMsg))?.total ?? 1, 25);
        window.mudae.log(`[${listBase}] page 1/${total}: ${names.length} names`);
        for (let p = 2; p <= total; p++) {
          await new Promise((r) => setTimeout(r, 600)); // spacing so Mudae doesn't drop rapid pages
          const more = namesOf(await fetchPage(`$${listBase} ${p}`));
          names = names.concat(more);
          window.mudae.log(`[${listBase}] page ${p}/${total}: +${more.length}`);
        }
        mergeInto(set, names);
      }).finally(() => setCollecting(false));
    },
    [collecting, enqueue, mergeInto],
  );

  // Collection-bound actions
  const addCharacter = useCallback((name: string) => addTo(setCollection, name), [addTo]);
  const removeCharacter = useCallback((id: string) => removeFrom(setCollection, id), [removeFrom]);
  const toggleStar = useCallback((id: string) => toggleStarIn(setCollection, id), [toggleStarIn]);
  const addNamesFromHarem = useCallback((text: string) => mergeInto(setCollection, parseHaremNames(text)), [mergeInto]);
  const autoCollectAll = useCallback(() => autoCollectInto(setCollection, 'mm'), [autoCollectInto]);
  const loadCharacter = useCallback((name: string) => hydrateViaIm(setCollection, name), [hydrateViaIm]);
  /** Re-read collection summary stats by sending $mmv (Mudae computes AVG + Top 15 value). */
  const refreshCollectionStats = useCallback(() => {
    const mmv = COMMANDS.find((c) => c.id === 'mmv');
    if (mmv) void send(mmv);
  }, [send]);

  // Wishlist-bound actions (mirror of collection)
  const addWish = useCallback((name: string) => addTo(setWishlist, name), [addTo]);
  const removeWish = useCallback((id: string) => removeFrom(setWishlist, id), [removeFrom]);
  const toggleWishStar = useCallback((id: string) => toggleStarIn(setWishlist, id), [toggleStarIn]);
  const addWishNames = useCallback((text: string) => mergeInto(setWishlist, parseHaremNames(text)), [mergeInto]);
  const autoCollectWishlist = useCallback(() => autoCollectInto(setWishlist, 'wl'), [autoCollectInto]);
  const loadWish = useCallback((name: string) => hydrateViaIm(setWishlist, name), [hydrateViaIm]);

  // --- History ---
  const removeHistory = useCallback((id: string) => setHistory((prev) => prev.filter((h) => h.id !== id)), []);
  const clearHistory = useCallback(() => setHistory([]), []);

  /** Queue a $im for a name and return the character art URL (for the History popout). */
  const fetchPortrait = useCallback(
    (name: string): Promise<string | null> =>
      enqueue(async () => {
        const reply = await awaitImReply(name);
        return reply?.embed?.image || null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueue],
  );

  /** Re-pull $im for a rolled character and patch that roll card with fresh art + stats. */
  const reloadRoll = useCallback(
    (id: string, name: string): Promise<void> => {
      setRolledHistory((prev) => prev.map((r) => (r.id === id ? { ...r, reloading: true } : r)));
      return enqueue(async () => {
        const reply = await awaitImReply(name);
        if (reply?.embed) {
          const embed = reply.embed;
          const ch = parseEmbedCharacter(embed);
          setRolledHistory((prev) =>
            prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    series: ch.category ?? r.series,
                    kakera: ch.kakera ?? r.kakera,
                    claimRank: ch.claimRank ?? r.claimRank,
                    likeRank: ch.likeRank ?? r.likeRank,
                    portrait: embed.image || r.portrait,
                    reloading: false,
                  }
                : r,
            ),
          );
        } else {
          window.mudae.log(`[reload] no $im reply for ${name}`);
          setRolledHistory((prev) => prev.map((r) => (r.id === id ? { ...r, reloading: false } : r)));
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueue],
  );

  const clearCooldown = useCallback((key: CooldownKey) => {
    setCooldowns((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const remaining = useCallback(
    (key: CooldownKey): number => Math.max(0, (cooldowns[key] ?? 0) - now),
    [cooldowns, now],
  );

  return {
    settings,
    cooldowns,
    log,
    now,
    rolledHistory,
    lastRoll: rolledHistory[0] ?? null,
    rollsRemaining,
    rollsResetMs: rollsResetAt ? Math.max(0, rollsResetAt - now) : 0,
    claimResetMs: claimResetAt ? Math.max(0, claimResetAt - now) : 0,
    refreshRolls,
    refreshClaim,
    claim,
    serverConfig,
    collection,
    collecting,
    addCharacter,
    removeCharacter,
    toggleStar,
    loadCharacter,
    addNamesFromHarem,
    autoCollectAll,
    collectionStats,
    refreshCollectionStats,
    wishlist,
    addWish,
    removeWish,
    toggleWishStar,
    loadWish,
    addWishNames,
    autoCollectWishlist,
    history,
    removeHistory,
    clearHistory,
    fetchPortrait,
    reloadRoll,
    kakeraShop,
    kakeraTower,
    refreshKakeraTower,
    ocrBusy,
    send,
    sendRaw,
    updateSettings,
    remaining,
    clearCooldown,
  };
}

export type UseMudae = ReturnType<typeof useMudae>;
