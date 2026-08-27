const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('updaterAPI',{onEvent:(cb)=>{const h=(_,d)=>cb(d);ipcRenderer.on('updater:event',h);return()=>ipcRenderer.removeListener('updater:event',h)}});
