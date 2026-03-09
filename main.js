const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { rpc } = require('./discord-rpc');

let mainWindow;
let overlayWindow;
let tray = null;
let gameDetectionInterval = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Ошибка чтения конфига:', e);
  }
  return { firstRun: true };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Ошибка записи конфига:', e);
  }
}

function createTray() {
  // Создаём иконку для трея из встроенных ресурсов
  let trayIcon;
  const iconPath = path.join(__dirname, 'icon.png');
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = createDefaultTrayIcon();
    }
  } catch (e) {
    trayIcon = createDefaultTrayIcon();
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть Discord',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
        }
      }
    },
    {
      label: 'Выйти',
      click: () => {
        app.isQuitting = true;
        if (mainWindow) {
          mainWindow.destroy();
        }
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Discord');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
    }
  });

  console.log('[Tray] Иконка в трее создана');
}

function createDefaultTrayIcon() {
  // Создаём простую иконку programmatically - синий круг на прозрачном фоне
  // Используем встроенные ресурсы Electron для Windows
  const iconSize = 32;
  const canvas = Buffer.alloc(iconSize * iconSize * 4);
  
  // Заполняем синим цветом Discord (#5865F2) с альфа-каналом
  for (let i = 0; i < iconSize * iconSize; i++) {
    const cx = i % iconSize;
    const cy = Math.floor(i / iconSize);
    const dx = cx - iconSize / 2;
    const dy = cy - iconSize / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= iconSize / 2 - 2) {
      // Внутри круга - синий цвет Discord
      canvas[i * 4 + 0] = 0xF2; // B
      canvas[i * 4 + 1] = 0x65; // G
      canvas[i * 4 + 2] = 0x58; // R
      canvas[i * 4 + 3] = 0xFF; // A
    } else {
      // Снаружи - прозрачный
      canvas[i * 4 + 0] = 0;
      canvas[i * 4 + 1] = 0;
      canvas[i * 4 + 2] = 0;
      canvas[i * 4 + 3] = 0;
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: iconSize, height: iconSize });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#2f3136',
    show: false, // Не показываем сразу
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Приложение загружено');
    const config = getConfig();
    if (config.firstRun) {
      mainWindow.webContents.send('show-welcome-dialog');
      config.firstRun = false;
      saveConfig(config);
    }
  });

  // Перехватываем закрытие окна - сворачиваем в трей вместо закрытия
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
      console.log('[Window] Окно скрыто в трей');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('maximize-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('maximize-changed', false);
  });
}

function createOverlay() {
  if (overlayWindow) {
    overlayWindow.close();
    return null;
  }

  overlayWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    backgroundColor: '#00000000',
  });

  overlayWindow.loadFile('index.html', {
    query: { overlay: 'true' }
  });

  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('app-quit', () => {
  app.isQuitting = true;
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

ipcMain.on('toggle-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  } else {
    createOverlay();
  }
});

ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

// Discord RPC IPC handlers
ipcMain.handle('discord-rpc-connect', async () => {
  return await rpc.connect();
});

ipcMain.handle('discord-rpc-set-activity', (event, activity) => {
  return rpc.setActivity(activity);
});

ipcMain.handle('discord-rpc-clear-activity', () => {
  return rpc.clearActivity();
});

ipcMain.handle('discord-rpc-get-games', async () => {
  // Возвращаем информацию о подключении
  return {
    connected: rpc.connected,
    pipeId: rpc.pipeId,
    clientId: rpc.clientId
  };
});

ipcMain.handle('discord-rpc-subscribe-activity', async () => {
  return await rpc.subscribeToActivity();
});

ipcMain.handle('discord-rpc-disconnect', () => {
  rpc.disconnect();
});

// Обнаружение запущенных игр
function startGameDetection() {
  if (gameDetectionInterval) return;
  
  const detectedGames = new Set();
  
  // Подписываемся на события активности
  rpc.subscribeToActivity().then((activity) => {
    if (activity && mainWindow) {
      mainWindow.webContents.send('game-detected', activity);
    }
  });
  
  gameDetectionInterval = setInterval(async () => {
    if (!rpc.connected) return;
    
    // Периодически проверяем активность
    try {
      const activity = await rpc.getCurrentActivity();
      if (activity && activity.name) {
        const gameId = activity.application_id || activity.name;
        if (!detectedGames.has(gameId)) {
          detectedGames.add(gameId);
          console.log('[GameDetect] Обнаружена активность:', activity.name);
          if (mainWindow) {
            mainWindow.webContents.send('game-detected', activity);
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }, 5000);
}

function stopGameDetection() {
  if (gameDetectionInterval) {
    clearInterval(gameDetectionInterval);
    gameDetectionInterval = null;
  }
}

ipcMain.on('start-game-detection', () => {
  startGameDetection();
});

ipcMain.on('stop-game-detection', () => {
  stopGameDetection();
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  globalShortcut.register('CommandOrControl+M', () => {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    } else {
      createOverlay();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
