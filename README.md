# Mudae Companion

A button-driven desktop UI for the **Mudae** Discord bot. Click buttons instead of
typing `$wa` / `$ha` / `$dk` / `$tu`; the app focuses your Discord window and pastes
the command for you. Built with Electron + React so one codebase runs on **macOS**
and **Windows 11**.

> ⚠️ **Discord ToS:** automating a Discord *user* account is against Discord's Terms
> and can get accounts banned. This app is deliberately human-in-the-loop — one
> command per click, no auto-roll loops — and throttles sends. Use at your own risk
> on a server where you and your friends are okay with it.

## How it works

- **Renderer (React)** — the button pad. Knows nothing about the OS; talks to the
  main process over a typed `window.mudae` bridge (`src/preload.ts`).
- **Main process (Node)** — does the OS-level work:
  - `src/main/sender.ts` — uses [nut.js] to find the Discord window by title,
    `focus()` it, paste the command (clipboard + ⌘/Ctrl+V), and press Enter.
  - `src/main/settings.ts` — JSON settings store in `userData`.
  - `src/main/permissions.ts` — macOS Accessibility / Screen Recording checks.
- **Command catalog** — `src/ui/commands.ts` is the single source of truth for every
  button (label, command body, group, cooldown). `src/ui/cooldowns.ts` holds Mudae's
  default cooldown durations.

**Claiming & kakera are reactions on Mudae's messages, not text commands** — so the
app drives rolling, `$daily`/`$dk`/`$vote`, `$tu`, divorces and the wishlist, but you
still click the heart / kakera in Discord yourself.

## Scripts

```bash
npm start      # run in dev (electron-forge start) — opens the app + DevTools
npm run package # build an unpacked app for the current OS
npm run make   # build distributables (macOS .zip / Windows Squirrel .exe)
npx tsc --noEmit  # type-check
```

## macOS permissions (required)

System Settings → Privacy & Security:

- **Accessibility** — lets nut.js send keystrokes to Discord.
- **Screen Recording** — lets the app read window titles (and, in Phase 2, capture
  the Discord window).

In dev the app appears as **Electron**; once packaged it appears as **Mudae
Companion**. The in-app banner links you here and offers a re-check button.

## Windows 11

No special permissions for keystroke injection or window capture — nut.js and
Electron's `desktopCapturer` work out of the box. Build Windows artifacts on a
Windows machine (or CI) with `npm run make`.

## Roadmap

- **Phase 1 (done):** command pad that types into Discord; local cooldown tracking;
  settings (target window, `$`/slash form, throttle).
- **Phase 2:** embed a live capture of the Discord window (`desktopCapturer`) inside
  the app; sync cooldowns more accurately.
- **Phase 3:** OCR (`tesseract.js`) over captured frames to parse `$tu` timers and
  highlight wished characters.

See `/Users/tuxman/.claude/plans/mudae-0807-is-a-discord-proud-dove.md` for the full plan.

[nut.js]: https://nutjs.dev/
# mudaeUI
