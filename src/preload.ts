import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/channels';
import type { AppSettings, MudaeBridge } from './shared/types';

// Expose a small, typed API to the renderer. No Node or ipcRenderer leaks past this.
const bridge: MudaeBridge = {
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  setSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke(IPC.SET_SETTINGS, patch),
  log: (message: string) => ipcRenderer.send(IPC.LOG_DEBUG, message),
  fetchImage: (url: string) => ipcRenderer.invoke(IPC.FETCH_IMAGE, url),
};

contextBridge.exposeInMainWorld('mudae', bridge);
