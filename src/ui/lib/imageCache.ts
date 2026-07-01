// IndexedDB cache for character art. Discord-proxied URLs (images-ext / media.discordapp)
// can rotate or expire, so we store the bytes locally keyed by normalized character name —
// instant load, and cards keep their art across reloads / offline. Bytes are fetched in the
// MAIN process (window.mudae.fetchImage) because Discord's CDN isn't CORS-open, so a
// renderer fetch()/canvas read would be blocked/tainted.

const DB_NAME = 'mudae-art';
const STORE = 'art';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Stable cache key for a character (so roll/collection/wishlist cards share one blob). */
export const artKey = (name: string) => name.trim().toLowerCase();

export async function getCachedArt(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function putCachedArt(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore cache write failures (quota, etc.) */
  }
}

/** Fetch `url` via main (no CORS), store the bytes under `key`, return the Blob (or null). */
export async function cacheArt(key: string, url: string): Promise<Blob | null> {
  try {
    const dataUrl = await window.mudae.fetchImage(url);
    if (!dataUrl) return null;
    const blob = await (await fetch(dataUrl)).blob(); // data: URL → same-origin, no CORS
    await putCachedArt(key, blob);
    return blob;
  } catch {
    return null;
  }
}
