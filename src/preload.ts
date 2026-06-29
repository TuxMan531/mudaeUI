import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/channels';
import type { AppSettings, MudaeBridge } from './shared/types';

// Expose a small, typed API to the renderer. No Node or ipcRenderer leaks past this.
const bridge: MudaeBridge = {
  sendCommand: (command) => ipcRenderer.invoke(IPC.SEND_COMMAND, command),
  listWindows: () => ipcRenderer.invoke(IPC.LIST_WINDOWS),
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  setSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IPC.SET_SETTINGS, patch),
  checkPermissions: () => ipcRenderer.invoke(IPC.CHECK_PERMISSIONS),
};

contextBridge.exposeInMainWorld('mudae', bridge);
