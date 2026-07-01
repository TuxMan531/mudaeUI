import { useCallback, useEffect, useRef, useState } from 'react';
// Injected into the Discord webview's page context on dom-ready.
import { DISCORD_CONTENT_SCRIPT } from '../../webview/discord-content';
import { discordHub } from './discordHub';

export interface DiscordEmbed {
  author: string;
  description: string[];
  footer: string;
  image: string;
}

export interface DiscordMessage {
  type: 'message' | 'status' | 'error' | 'imageUpdate';
  id?: string;
  content?: string;
  embed?: DiscordEmbed;
  authorId?: string | null;
  isMudae?: boolean;
  reactions?: string[];
  msg?: string;
  /** For type 'imageUpdate': the late-resolved embed art URL for message `id`. */
  image?: string;
}

const TAG = 'MUDAE_MSG:';

/**
 * Drives the embedded Discord <webview>: injects the content script, receives parsed
 * messages over the console channel, and sends commands into Discord's editor.
 */
export function useDiscordBridge() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('loading…');

  // Ref callback from DiscordPanel — binds listeners once.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bind = useCallback((el: any) => {
    if (!el || el === webviewRef.current) return;
    webviewRef.current = el;

    el.addEventListener('dom-ready', () => {
      setReady(true);
      el.executeJavaScript(DISCORD_CONTENT_SCRIPT).catch(() => {});
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    el.addEventListener('console-message', (e: any) => {
      const line: string = e.message ?? '';
      if (!line.startsWith(TAG)) return;
      try {
        const data: DiscordMessage = JSON.parse(line.slice(TAG.length));
        if (data.type === 'status') setStatus(data.msg ?? 'ok');
        discordHub.emit(data);
      } catch {
        /* ignore malformed line */
      }
    });
  }, []);

  const sendCommand = useCallback((text: string): Promise<string> => {
    const el = webviewRef.current;
    if (!el) return Promise.resolve('no-webview');
    return el.executeJavaScript(`window.__mudaeSend(${JSON.stringify(text)})`);
  }, []);

  // Make the bridge's sender available to useMudae via the hub.
  useEffect(() => discordHub.setSender(sendCommand), [sendCommand]);

  const reload = useCallback(() => webviewRef.current?.reload(), []);
  const openDevTools = useCallback(() => webviewRef.current?.openDevTools(), []);

  return { bind, ready, status, sendCommand, reload, openDevTools };
}

export type DiscordBridge = ReturnType<typeof useDiscordBridge>;
