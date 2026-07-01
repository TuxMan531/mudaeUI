import fs from 'node:fs';

// A fixed-path debug log so diagnostics are readable even when the app is launched
// standalone (via `open`), where stdout isn't attached to a terminal.
export const DEBUG_LOG_FILE = '/tmp/mudae-companion-debug.log';

export function debugLog(msg: string): void {
  try {
    fs.appendFileSync(DEBUG_LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
  } catch {
    /* best effort */
  }
}
