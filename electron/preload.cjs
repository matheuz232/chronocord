const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  serverRequest: (request) => ipcRenderer.invoke('server:request', request),
  socketConnect: (options) => ipcRenderer.invoke('socket:connect', options),
  socketEmit: (payload) => ipcRenderer.invoke('socket:emit', payload),
  socketStatus: () => ipcRenderer.invoke('socket:status'),
  socketDisconnect: () => ipcRenderer.invoke('socket:disconnect'),
  getDesktopSources: (options = {}) => ipcRenderer.invoke('media:get-desktop-sources', options),
  writeClipboardText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  onSocketEvent: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('socket:event', handler);
    return () => ipcRenderer.removeListener('socket:event', handler);
  },
  getSavedLogin: () => ipcRenderer.invoke('auth:get-saved-login'),
  saveLogin: (data) => ipcRenderer.invoke('auth:save-login', data),
  clearSavedLogin: () => ipcRenderer.invoke('auth:clear-saved-login'),
  onMaximizeChange: (callback) => {
    const handler = (_event, value) => callback(Boolean(value));
    ipcRenderer.on('window:maximized-changed', handler);
    return () => ipcRenderer.removeListener('window:maximized-changed', handler);
  }
});
