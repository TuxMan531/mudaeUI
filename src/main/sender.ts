import { clipboard } from 'electron';
import { keyboard, Key, getWindows, sleep } from '@nut-tree-fork/nut-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadSettings } from './settings';
import { SendResult, WindowInfo } from '../shared/types';

const execFileAsync = promisify(execFile);

// Type fast — the default 300ms autoDelay makes multi-key combos sluggish.
keyboard.config.autoDelayMs = 5;

const IS_MAC = process.platform === 'darwin';
const PASTE_MODIFIER = IS_MAC ? Key.LeftCmd : Key.LeftControl;

let lastSendAt = 0;

/**
 * Bring the target to the foreground.
 * - macOS: `open -a "<AppName>"` activates the app by name. Needs NO Screen
 *   Recording / Automation permission, and can't accidentally match the wrong
 *   window (we target the app, not a title substring).
 * - Windows/Linux: find a window whose title contains the match string and focus it.
 */
async function focusTarget(match: string): Promise<{ ok: boolean; title?: string; error?: string }> {
  if (IS_MAC) {
    try {
      await execFileAsync('open', ['-a', match]);
      return { ok: true, title: match };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Couldn't activate app "${match}". On macOS this is the application NAME (e.g. "Discord"). ${msg}`,
      };
    }
  }

  const needle = match.trim().toLowerCase();
  const windows = await getWindows();
  for (const win of windows) {
    let title = '';
    try {
      title = await win.getTitle();
    } catch {
      continue;
    }
    if (title && title.toLowerCase().includes(needle)) {
      await win.focus();
      return { ok: true, title };
    }
  }
  return { ok: false, error: `No window matching "${match}". Is Discord open?` };
}

/** Candidate targets for the Settings picker (app names on macOS, window titles elsewhere). */
export async function listWindows(): Promise<WindowInfo[]> {
  const out: WindowInfo[] = [];
  try {
    if (IS_MAC) {
      // Foreground (non-background-only) app names via System Events.
      const { stdout } = await execFileAsync('osascript', [
        '-e',
        'tell application "System Events" to get name of (every process whose background only is false)',
      ]);
      for (const name of stdout.split(',')) {
        const t = name.trim();
        if (t) out.push({ title: t });
      }
    } else {
      const windows = await getWindows();
      for (const win of windows) {
        try {
          const title = await win.getTitle();
          if (title && title.trim()) out.push({ title });
        } catch {
          /* ignore unreadable windows */
        }
      }
    }
  } catch (err) {
    console.error('[sender] listWindows failed:', err);
  }
  const seen = new Set<string>();
  return out.filter((w) => (seen.has(w.title) ? false : (seen.add(w.title), true)));
}

/**
 * Focus Discord, paste `command` into the focused input, press Enter.
 * Clipboard-paste is more reliable than per-key typing and immune to layout quirks;
 * the previous clipboard is restored afterwards.
 */
export async function sendCommand(command: string): Promise<SendResult> {
  const settings = loadSettings();

  const now = Date.now();
  if (now - lastSendAt < settings.throttleMs) {
    return { ok: false, error: `Throttled — wait ${settings.throttleMs}ms between sends.` };
  }

  const focus = await focusTarget(settings.windowTitleMatch);
  if (!focus.ok) {
    return { ok: false, error: focus.error };
  }

  const previousClipboard = settings.restoreClipboard ? clipboard.readText() : '';
  try {
    clipboard.writeText(command);
    await sleep(IS_MAC ? 220 : 120); // let the app come to the front + clipboard settle

    await keyboard.pressKey(PASTE_MODIFIER, Key.V);
    await keyboard.releaseKey(PASTE_MODIFIER, Key.V);
    await sleep(30);
    await keyboard.type(Key.Enter);

    lastSendAt = Date.now();

    if (settings.restoreClipboard) {
      setTimeout(() => {
        try {
          clipboard.writeText(previousClipboard);
        } catch {
          /* best effort */
        }
      }, 400);
    }
    return { ok: true, focusedTitle: focus.title };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
