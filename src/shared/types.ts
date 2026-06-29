// Shared between the main process and the renderer (the IPC contract).

export type PrefixMode = 'dollar' | 'slash';

export interface AppSettings {
  /** Substring matched (case-insensitive) against window titles to find Discord. */
  windowTitleMatch: string;
  /** Whether buttons emit "$wa" (dollar) or "/wa" (slash). */
  prefixMode: PrefixMode;
  /** Minimum milliseconds between two sends (anti-spam throttle). */
  throttleMs: number;
  /** Restore the user's clipboard after a paste-send. */
  restoreClipboard: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  windowTitleMatch: 'Discord',
  prefixMode: 'dollar',
  throttleMs: 1200,
  restoreClipboard: true,
};

export interface SendResult {
  ok: boolean;
  /** Title of the window we focused, when successful. */
  focusedTitle?: string;
  error?: string;
}

export interface WindowInfo {
  title: string;
}

export interface PermissionStatus {
  /** macOS Accessibility — required for keystroke injection. */
  accessibility: boolean;
  /** macOS Screen Recording — required to read window titles / capture. */
  screen: boolean;
  /** Whether these checks are even relevant on this platform. */
  platform: NodeJS.Platform;
}

/** The API surface exposed to the renderer via contextBridge (window.mudae). */
export interface MudaeBridge {
  sendCommand(command: string): Promise<SendResult>;
  listWindows(): Promise<WindowInfo[]>;
  getSettings(): Promise<AppSettings>;
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings>;
  checkPermissions(): Promise<PermissionStatus>;
}
