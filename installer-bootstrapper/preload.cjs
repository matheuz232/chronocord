'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('installerAPI', {
  getInfo: () => ipcRenderer.invoke('installer:get-info'),
  chooseFolder: () => ipcRenderer.invoke('installer:choose-folder'),
  install: (installDir) => ipcRenderer.invoke('installer:install', installDir),
  launch: () => ipcRenderer.invoke('installer:launch'),
  minimize: () => ipcRenderer.invoke('installer:minimize'),
  close: () => ipcRenderer.invoke('installer:close'),
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('installer:event', listener);
    return () => ipcRenderer.removeListener('installer:event', listener);
  },
});
