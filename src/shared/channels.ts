// IPC channel names shared by the preload bridge and the main-process handlers.
export const IPC = {
  SEND_COMMAND: 'mudae:send-command',
  LIST_WINDOWS: 'mudae:list-windows',
  GET_SETTINGS: 'mudae:get-settings',
  SET_SETTINGS: 'mudae:set-settings',
  CHECK_PERMISSIONS: 'mudae:check-permissions',
} as const;
