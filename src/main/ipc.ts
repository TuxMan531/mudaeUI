import { ipcMain } from 'electron';
import { loadSettings, saveSettings } from './settings';
import { debugLog } from './debugLog';
import { AppSettings } from '../shared/types';
import { IPC } from '../shared/channels';

// Sending + reading Discord now happens entirely in the renderer via the embedded
// <webview>, so the main process only owns settings persistence + the debug log.
export function registerIpc(): void {
  ipcMain.handle(IPC.GET_SETTINGS, () => loadSettings());

  ipcMain.handle(IPC.SET_SETTINGS, (_e, patch: Partial<AppSettings>) => saveSettings(patch ?? {}));

  ipcMain.on(IPC.LOG_DEBUG, (_e, message: string) => {
    console.log(`[renderer] ${message}`);
    debugLog(`[renderer] ${message}`);
  });

  // Fetch a remote image in the main process (no browser CORS) and hand the renderer a
  // data URL it can cache locally. Used by the IndexedDB art cache.
  ipcMain.handle(IPC.FETCH_IMAGE, async (_e, url: string): Promise<string | null> => {
    try {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const type = res.headers.get('content-type') || 'image/png';
      if (!/^image\//i.test(type)) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > 8_000_000) return null; // sanity cap (~8MB)
      return `data:${type};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });
}
