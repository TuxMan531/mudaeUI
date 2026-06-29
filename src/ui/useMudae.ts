import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings, PermissionStatus, SendResult } from '../shared/types';
import type { CooldownKey } from './cooldowns';
import { COOLDOWNS } from './cooldowns';
import { resolveCommandText, type MudaeCommand } from './commands';

const COOLDOWN_STORAGE_KEY = 'mudae.cooldowns.v1';

export interface LogEntry {
  id: number;
  text: string;
  ok: boolean;
  error?: string;
  at: number;
}

/** endsAt timestamps (ms) keyed by cooldown. */
type CooldownState = Partial<Record<CooldownKey, number>>;

function loadCooldowns(): CooldownState {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

let logSeq = 0;

export function useMudae() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [cooldowns, setCooldowns] = useState<CooldownState>(loadCooldowns);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const sendingRef = useRef(false);

  // Load settings + permissions on mount.
  useEffect(() => {
    window.mudae.getSettings().then(setSettings);
    window.mudae.checkPermissions().then(setPermissions);
  }, []);

  // 1s tick drives countdown rendering.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist cooldowns whenever they change.
  useEffect(() => {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  }, [cooldowns]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await window.mudae.setSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const refreshPermissions = useCallback(async () => {
    const p = await window.mudae.checkPermissions();
    setPermissions(p);
    return p;
  }, []);

  const send = useCallback(
    async (cmd: MudaeCommand): Promise<SendResult> => {
      if (!settings || sendingRef.current) return { ok: false, error: 'busy' };
      sendingRef.current = true;
      const text = resolveCommandText(cmd, settings.prefixMode);
      try {
        const result = await window.mudae.sendCommand(text);
        if (result.ok && cmd.cooldownKey) {
          const key = cmd.cooldownKey;
          setCooldowns((prev) => ({ ...prev, [key]: Date.now() + COOLDOWNS[key].durationMs }));
        }
        setLog((prev) =>
          [{ id: ++logSeq, text, ok: result.ok, error: result.error, at: Date.now() }, ...prev].slice(0, 50),
        );
        return result;
      } finally {
        sendingRef.current = false;
      }
    },
    [settings],
  );

  const clearCooldown = useCallback((key: CooldownKey) => {
    setCooldowns((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /** Remaining ms for a cooldown, or 0 if ready. */
  const remaining = useCallback(
    (key: CooldownKey): number => Math.max(0, (cooldowns[key] ?? 0) - now),
    [cooldowns, now],
  );

  return {
    settings,
    permissions,
    cooldowns,
    log,
    now,
    send,
    updateSettings,
    refreshPermissions,
    remaining,
    clearCooldown,
  };
}
