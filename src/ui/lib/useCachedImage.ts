import { useEffect, useRef, useState } from 'react';
import { artKey, cacheArt, getCachedArt } from './imageCache';

/**
 * Resolve a character's art to a displayable src, preferring a locally-cached blob so it
 * loads instantly and survives reloads / proxy-URL expiry. On a cache miss it returns the
 * network `url` immediately and caches the bytes (via the main process) in the background.
 * A previously-cached character renders even when `url` is undefined.
 */
export function useCachedImage(name: string | undefined, url: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>(url);
  const objectUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = undefined;
      }
    };
    const show = (blob: Blob) => {
      revoke();
      const u = URL.createObjectURL(blob);
      objectUrlRef.current = u;
      if (!cancelled) setSrc(u);
    };

    setSrc(url);
    if (!name) return () => { cancelled = true; revoke(); };

    const key = artKey(name);
    void (async () => {
      const cached = await getCachedArt(key);
      if (cancelled) return;
      if (cached) {
        show(cached);
        return;
      }
      if (url) {
        const blob = await cacheArt(key, url);
        if (!cancelled && blob) show(blob);
      }
    })();

    return () => { cancelled = true; revoke(); };
  }, [name, url]);

  return src;
}
