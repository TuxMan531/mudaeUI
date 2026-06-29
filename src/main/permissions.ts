import { systemPreferences } from 'electron';
import { PermissionStatus } from '../shared/types';

// macOS gates keystroke injection behind Accessibility and window reading/capture
// behind Screen Recording. On Windows/Linux these aren't applicable, so we report
// "granted" to keep the renderer logic uniform.
export function checkPermissions(): PermissionStatus {
  const platform = process.platform;
  if (platform !== 'darwin') {
    return { accessibility: true, screen: true, platform };
  }

  // isTrustedAccessibilityClient(false) checks without prompting.
  const accessibility = systemPreferences.isTrustedAccessibilityClient(false);
  // 'screen' status is one of: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'
  const screen = systemPreferences.getMediaAccessStatus('screen') === 'granted';

  return { accessibility, screen, platform };
}

/** Prompts (once) for Accessibility by passing true; safe no-op off macOS. */
export function promptAccessibility(): void {
  if (process.platform === 'darwin') {
    systemPreferences.isTrustedAccessibilityClient(true);
  }
}
