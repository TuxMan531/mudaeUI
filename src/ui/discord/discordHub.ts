import type { DiscordMessage } from './useDiscordBridge';

// Decouples the webview bridge (owns the <webview>) from useMudae (owns app state).
// The bridge registers its sender + emits parsed messages here; useMudae sends through
// here and subscribes to incoming messages. Avoids a circular hook dependency.

type Handler = (m: DiscordMessage) => void;
type Sender = (text: string) => Promise<string>;

let sender: Sender = async () => 'no-bridge';
const handlers = new Set<Handler>();

export const discordHub = {
  setSender(fn: Sender) {
    sender = fn;
  },
  send(text: string): Promise<string> {
    return sender(text);
  },
  onMessage(h: Handler): () => void {
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  },
  emit(m: DiscordMessage) {
    handlers.forEach((h) => h(m));
  },
  /** Send a command and resolve with the first Mudae reply matching `match` (or null on timeout). */
  sendAndAwait(text: string, match: (m: DiscordMessage) => boolean, timeoutMs = 8000): Promise<DiscordMessage | null> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (m: DiscordMessage | null) => {
        if (settled) return;
        settled = true;
        off();
        clearTimeout(timer);
        resolve(m);
      };
      const off = this.onMessage((m) => {
        if (match(m)) finish(m);
      });
      const timer = setTimeout(() => finish(null), timeoutMs);
      void this.send(text);
    });
  },
  /**
   * Reliable send: paste the command, wait up to `perTryMs` for a matching Mudae reply,
   * and resend (up to `maxTries` total) if none arrives — the Slate paste into Discord
   * occasionally no-ops. Resolves with the first matching reply, or null if every attempt
   * times out. A genuinely slow first reply can make Mudae answer twice; the router
   * dedupes repeats of the SAME message by id, and idempotent replies ($tu/$k) re-apply
   * harmlessly. Default match = any Mudae message.
   */
  async sendReliable(
    text: string,
    match: (m: DiscordMessage) => boolean = (m) => m.isMudae === true,
    perTryMs = 5000,
    maxTries = 2,
  ): Promise<DiscordMessage | null> {
    for (let attempt = 0; attempt < maxTries; attempt++) {
      const reply = await this.sendAndAwait(text, match, perTryMs);
      if (reply) return reply;
    }
    return null;
  },
  /** Resolve with the art url from a late 'imageUpdate' for `messageId` (or null on timeout).
   *  Embeds match before their art finishes loading, so callers use this to wait for it. */
  waitForImage(messageId: string, timeoutMs = 8000): Promise<string | null> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (img: string | null) => {
        if (settled) return;
        settled = true;
        off();
        clearTimeout(timer);
        resolve(img);
      };
      const off = this.onMessage((m) => {
        if (m.type === 'imageUpdate' && m.id === messageId && m.image) finish(m.image);
      });
      const timer = setTimeout(() => finish(null), timeoutMs);
    });
  },
};
