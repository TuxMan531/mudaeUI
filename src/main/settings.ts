import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { AppSettings, DEFAULT_SETTINGS } from '../shared/types';

// Tiny JSON-file settings store in userData. Kept dependency-free for Phase 1;
// can be swapped for electron-store later if we need migrations/atomic writes.

let cache: AppSettings | null = null;

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  if (cache) return cache;
  let loaded: AppSettings;
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8');
    loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    loaded = { ...DEFAULT_SETTINGS };
  }
  cache = loaded;
  return loaded;
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  cache = next;
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.error('[settings] failed to persist:', err);
  }
  return next;
}
