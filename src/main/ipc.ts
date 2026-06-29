import { ipcMain } from 'electron';
import { sendCommand, listWindows } from './sender';
import { loadSettings, saveSettings } from './settings';
import { checkPermissions } from './permissions';
import { AppSettings } from '../shared/types';
import { IPC } from '../shared/channels';

export function registerIpc(): void {
  ipcMain.handle(IPC.SEND_COMMAND, async (_e, command: string) => {
    if (typeof command !== 'string' || !command.trim()) {
      return { ok: false, error: 'Empty command.' };
    }
    const result = await sendCommand(command);
    if (result.ok) {
      console.log(`[send] "${command}" -> OK (focused: ${result.focusedTitle})`);
    } else {
      console.log(`[send] "${command}" -> FAIL: ${result.error}`);
    }
    return result;
  });

  ipcMain.handle(IPC.LIST_WINDOWS, () => listWindows());

  ipcMain.handle(IPC.GET_SETTINGS, () => loadSettings());

  ipcMain.handle(IPC.SET_SETTINGS, (_e, patch: Partial<AppSettings>) => saveSettings(patch ?? {}));

  ipcMain.handle(IPC.CHECK_PERMISSIONS, () => checkPermissions());
}
