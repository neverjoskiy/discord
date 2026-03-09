const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('maximize-changed', (event, isMaximized) => callback(isMaximized));
  },
  onShowWelcomeDialog: (callback) => {
    ipcRenderer.on('show-welcome-dialog', () => callback());
  },
  onGameDetected: (callback) => {
    ipcRenderer.on('game-detected', (event, game) => callback(game));
  },
  isOverlay: () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('overlay') === 'true';
  },
  // Discord RPC
  discordRPC: {
    connect: () => ipcRenderer.invoke('discord-rpc-connect'),
    setActivity: (activity) => ipcRenderer.invoke('discord-rpc-set-activity', activity),
    clearActivity: () => ipcRenderer.invoke('discord-rpc-clear-activity'),
    getGames: () => ipcRenderer.invoke('discord-rpc-get-games'),
    subscribeActivity: () => ipcRenderer.invoke('discord-rpc-subscribe-activity'),
    disconnect: () => ipcRenderer.send('discord-rpc-disconnect'),
  },
  gameDetection: {
    start: () => ipcRenderer.send('start-game-detection'),
    stop: () => ipcRenderer.send('stop-game-detection'),
  },
});
