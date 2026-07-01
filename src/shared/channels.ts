// IPC channel names shared by the preload bridge and the main-process handlers.
export const IPC = {
  GET_SETTINGS: 'mudae:get-settings',
  SET_SETTINGS: 'mudae:set-settings',
  LOG_DEBUG: 'mudae:log-debug',
  // Fetch a remote image in the main process (no CORS) → data URL, for the local art cache.
  FETCH_IMAGE: 'mudae:fetch-image',
} as const;
