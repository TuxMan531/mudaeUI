# CLAUDE.md — Mudae Companion

Guidance for AI agents working in this repo. Read this first.

## What this is
A cross-platform (macOS + Windows 11) **Electron + React + TypeScript** desktop app that wraps the **Mudae**
Discord bot (anime/game gacha) in a button/tab UI. You click buttons instead of typing `$wa`/`$ha`/`$tu`,
and the app reads Mudae's replies and surfaces them as cards/timers/collection/etc.

Built incrementally over many sessions. **It is currently mid-architecture-pivot — read the next section.**

## STATUS — Phase 5 done: reads/sends via embedded Discord (OCR/nut.js removed)
The app **embeds `discord.com` in an Electron `<webview>`** and reads/writes its **DOM** directly. The old
screen-capture OCR + nut.js keystroke layer is **deleted**. Result: exact structured data, no calibration,
**no Screen Recording/Accessibility**, and `npm start` dev mode is the normal loop.

How it flows:
- `src/main.ts` sets `webviewTag:true` + a Chrome `app.userAgentFallback`.
- `src/ui/components/DiscordPanel.tsx` renders the `<webview>` (toggleable via the header **Discord** button;
  stays mounted when hidden so it keeps observing). Log in once — session persists (`partition="persist:discord"`).
- `src/webview/discord-content.ts` (a `String.raw` JS string injected on `dom-ready`): a `MutationObserver`
  reads Mudae messages and `console.log('MUDAE_MSG:'+json)`; `window.__mudaeSend(text)` types via a Slate paste.
- `src/ui/discord/useDiscordBridge.ts` injects the script, catches `console-message`, and forwards to
  `src/ui/discord/discordHub.ts` (sender registry + pub/sub + `sendAndAwait`).
- `src/ui/useMudae.ts` sends via `discordHub.send`; a **passive subscriber** (`routeMessage`) classifies every
  incoming Mudae message (roll / $rolls / $k / $tu) so manual actions in the panel also update the app; `$im`/
  `$mm`/`$wl` use `discordHub.sendAndAwait`. Parsers live in `src/ui/parsers.ts` (moved out of the deleted `ocr/`).

Known follow-ups: selectors in `discord-content.ts` may need updating when Discord ships UI changes (verify via
the panel's DevTools button).

**Roll/$im images (solved):** Mudae's art is hosted on `mudae.net`, which is hotlink-protected — the raw URL
loads inside the Discord webview but **fails from our renderer**. Discord proxies it for display via
`images-ext-*.discordapp.net` / `media.discordapp.net` / `cdn.discordapp.com`, and those proxy URLs load
anywhere. So `pickEmbedImage` in `discord-content.ts` takes **only** Discord-proxied media (ignoring raw
`mudae.net` hrefs + emoji `<img>`s), and `waitForImageThenEmit` briefly waits for that proxied `<img>` to
render (it appears a tick after the message `li`) before emitting — so `embed.image` is a loadable URL.

Roadmap/plan + full history: `/Users/tuxman/.claude/plans/mudae-0807-is-a-discord-proud-dove.md`.

## Run / build / debug
- **Dev:** `npm start` (electron-forge + Vite; opens app + DevTools). Works for the webview path with no
  special permissions.
- **Type-check (run after every change):** `npx tsc --noEmit`.
- **Package:** `npm run package` → `out/Mudae Companion-darwin-arm64/Mudae Companion.app`. Launch with
  `open "<that path>"` so macOS gives it its own TCC identity (needed only while the OCR path is still in the
  build; after 5c, dev mode is enough). `npm run make` builds distributables.
- **Debug log:** main appends to `/tmp/mudae-companion-debug.log` (`src/main/debugLog.ts`); the renderer logs
  through `window.mudae.log(...)`. `tail -f` it to watch `[send]`, `[ocr]`, `[discord]` events.

## Architecture map
- **Main:** `src/main.ts` (BrowserWindow, `webviewTag`, UA spoof, registers IPC). `src/main/ipc.ts`,
  `settings.ts` (JSON store in userData), `debugLog.ts`. *(Retiring: `sender.ts` nut.js, `capture.ts`
  desktopCapturer, `permissions.ts`.)*
- **Bridge:** `src/preload.ts` exposes typed `window.mudae` (channels in `src/shared/channels.ts`, types in
  `src/shared/types.ts`).
- **Renderer root:** `src/ui/App.tsx` — app shell: hamburger drawer (`Sidebar`), tab router, free-form
  command input, and the toggleable `DiscordPanel`.
- **State hook (the heart):** `src/ui/useMudae.ts` — owns the **command queue** (FIFO; each task =
  send→wait→OCR→apply; **claim jumps the queue**), cooldowns (synced from `$tu`), the **collection** +
  **wishlist** stores (`$im`-hydrated), **history** (persistent lightweight log), **kakera shop** (from `$k`),
  rolls/claims counters, plus `send`/`sendRaw`/`claim`/`loadCharacter`/`autoCollect*`/`fetchPortrait`.
- **Catalog:** `src/ui/commands.ts` (every button: id/label/base/section/cooldownKey), `src/ui/cooldowns.ts`.
- **Parsers (KEEP — reused on clean DOM text in 5b):** `src/ui/ocr/parsers.ts` — `parseRoll`, `parseImStats`,
  `parseTu`, `parseRolls`, `parseKakeraShop`, `parseHaremNames`, `parsePageInfo`, `parseClaimResult`,
  `extractKakera`. (Will move out of `ocr/` when OCR is deleted.)
- **Components:** `src/ui/components/*` — `SectionPanel` (per-tab content), `CommandPad`, `RollCard`,
  `RecentRolls` (cards, 2-min expiry), `CollectionGrid` (+ `CharacterCard`) reused for collection & wishlist,
  `HistoryPanel` (+ `CharacterImageModal`), `KakeraShop`, `Settings`.

## Mudae domain notes
- **Roll embed:** author = character **name**; description lines = **category** (series), `Claims: #N`,
  `Likes: #N`, kakera; footer = `Belongs to <user>` (owned). `$im` adds a `"<X> roulette · <kakera> · <key>(N)"`
  line (kakera comes ONLY from there — never the `(+20)` badge line). Identify Mudae by avatar **user-id
  `432610292342587392`**.
- **`$tu`** = timer dashboard (claim/rolls/daily/power/dk/vote). **`$k`** = kakera balance + power-badge shop
  (`Bronze II · Next level: 3,000 ◈ · +1 wishlist slot`, bought via `$bronze`…). **`$mm`/`$wl`** paginate
  with `$mm 2` / `$wl 2` ("Page 1/N"). Claim = sending a claim text (user's is `+:100:`), configurable.

## Gotchas / decisions
- **Discord webview:** needs a Chrome UA (`app.userAgentFallback`) or Discord serves "unsupported browser".
  `<webview>` is a top-level context → **not** blocked by Discord's CSP `frame-ancestors`. Login persists via
  `partition="persist:discord"`. Class names are hashed → **all selectors live in `discord-content.ts`**;
  verify with the webview DevTools (button in `DiscordPanel`). Guest→host = `console.log('MUDAE_MSG:'+json)`
  caught by the webview `console-message` event; host→guest = `webview.executeJavaScript('window.__mudaeSend(...)')`.
  The content script is a `String.raw` constant (not `?raw`, which doesn't resolve under
  `moduleResolution:node`).
- **macOS TCC (old path):** terminal-launched dev Electron can't get Screen Recording; only a packaged app
  launched via `open` can. The pivot removes this whole problem.
- **ToS / risk:** automating a user account / reading via injected scripts violates Discord ToS (account-ban
  risk). User has accepted this; keep things human-in-the-loop where reasonable.
- **Styling:** Tailwind; `cn()` from `src/ui/lib/utils.ts`; `lucide-react` (v1.x) icons. Match the dark-zinc
  look of existing components.

## Working style that fits this repo
- After edits: `npx tsc --noEmit`, then `npm start` (dev) — no repackage needed for the webview path.
- The user iterates fast and "vibes" features in batches; keep momentum, but flag genuine forks
  (AskUserQuestion) before large rewrites.
