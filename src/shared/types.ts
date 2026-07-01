// Shared between the main process and the renderer (the IPC contract).

export type PrefixMode = 'dollar' | 'slash';

export interface AppSettings {
  /** Whether buttons emit "$wa" (dollar) or "/wa" (slash). */
  prefixMode: PrefixMode;
  /** Text sent to claim the latest roll (e.g. "+:100:"). */
  claimText: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  prefixMode: 'dollar',
  claimText: '+:100:',
};

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** The API surface exposed to the renderer via contextBridge (window.mudae). */
export interface MudaeBridge {
  getSettings(): Promise<AppSettings>;
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings>;
  log(message: string): void;
  /** Fetch a remote image in main (no CORS) → data URL string, or null on failure. */
  fetchImage(url: string): Promise<string | null>;
}
