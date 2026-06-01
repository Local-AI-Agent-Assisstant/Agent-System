import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let bubbleWindow = null;
let pythonProcess = null;

// Drag state — managed entirely in main process
let dragInterval = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

const isDev = !app.isPackaged;
const BUBBLE_SIZE = 90;
const BASKET_THRESHOLD = 110; // px from bottom edge = basket zone

// ── Main application window ──────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Batman AI',
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('\n\n=== RENDERER PROCESS CRASHED ===');
    console.error('Reason:', details.reason);
    console.error('Exit Code:', details.exitCode);
    console.error('================================\n\n');
  });

  if (!isDev) {
    const serverPath = path.join(process.resourcesPath, 'server.exe');
    console.log('Launching Python server at:', serverPath);
    pythonProcess = spawn(serverPath, [], { detached: false });
    pythonProcess.stdout.on('data', (d) => console.log(`Server: ${d}`));
    pythonProcess.stderr.on('data', (d) => console.error(`Server err: ${d}`));
  }

  if (isDev) {
    const tryLoad = async () => {
      try {
        await mainWindow.loadURL('http://localhost:5173/');
        console.log('Connected to Vite Dev Server!');
      } catch (e) {
        console.log('Waiting for Vite to start on port 5173...');
        setTimeout(tryLoad, 1500);
      }
    };
    tryLoad();
  } else {
    setTimeout(() => {
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }, 2000);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeBubble();
  });
}

// ── Bubble helpers ───────────────────────────────────────────────────────────
function closeBubble() {
  stopDragLoop();
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.close();
    bubbleWindow = null;
  }
}

function stopDragLoop() {
  if (dragInterval) {
    clearInterval(dragInterval);
    dragInterval = null;
  }
}

// ── Floating Bubble Window ───────────────────────────────────────────────────
function createBubbleWindow() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    return; // Already open
  }

  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const MARGIN = 20;

  bubbleWindow = new BrowserWindow({
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    x: sw - BUBBLE_SIZE - MARGIN,
    y: sh - BUBBLE_SIZE - MARGIN,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,   // Don't steal focus from main window
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    bubbleWindow.loadURL('http://localhost:5173/#/bubble');
  } else {
    bubbleWindow.loadFile(
      path.join(__dirname, '..', 'dist', 'index.html'),
      { hash: '/bubble' }
    );
  }

  bubbleWindow.on('closed', () => {
    bubbleWindow = null;
  });
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Create bubble window (called from VoiceChatModal "Bubble" button)
  ipcMain.on('create-bubble', () => {
    createBubbleWindow();
  });

  // Close bubble (called when voice chat modal closes)
  ipcMain.on('close-bubble', () => {
    closeBubble();
  });

  // Voice chat was closed in the main window → auto-close bubble too
  ipcMain.on('voice-chat-closed', () => {
    closeBubble();
  });

  // Bubble clicked → focus main window + open voice chat
  ipcMain.on('bubble-clicked', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('open-voice-chat');
    }
    closeBubble();
  });

  ipcMain.on('request-main-window-focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'floating');
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.on('release-main-window-focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(false);
    }
  });

  // Relay voice state to bubble window
  ipcMain.on('voice-state-changed', (e, state) => {
    if (bubbleWindow && !bubbleWindow.isDestroyed()) {
      bubbleWindow.webContents.send('voice-state-update', state);
    }
  });

  // ── Drag Engine ──────────────────────────────────────────────────────────
  // Renderer sends the cursor offset within the bubble when drag starts.
  // Main polls cursor position at 60fps and moves the bubble window.
  ipcMain.on('start-bubble-drag', (e, { offsetX, offsetY }) => {
    if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
    dragOffsetX = offsetX;
    dragOffsetY = offsetY;

    stopDragLoop(); // Safety: clear any previous loop

    dragInterval = setInterval(() => {
      if (!bubbleWindow || bubbleWindow.isDestroyed()) {
        stopDragLoop();
        return;
      }

      const cursor = screen.getCursorScreenPoint();
      const newX = Math.round(cursor.x - dragOffsetX);
      const newY = Math.round(cursor.y - dragOffsetY);

      bubbleWindow.setPosition(newX, newY);

      // Detect basket zone: near bottom of work area
      const display = screen.getPrimaryDisplay();
      const { height: sh } = display.workAreaSize;
      const isInBasket = newY + BUBBLE_SIZE > sh - BASKET_THRESHOLD + BUBBLE_SIZE;
      bubbleWindow.webContents.send('basket-update', isInBasket);
    }, 16); // ~60fps
  });

  // Drag ended → check if we should close (dropped in basket zone)
  ipcMain.on('stop-bubble-drag', () => {
    stopDragLoop();

    if (!bubbleWindow || bubbleWindow.isDestroyed()) return;

    const [, y] = bubbleWindow.getPosition();
    const display = screen.getPrimaryDisplay();
    const { height: sh } = display.workAreaSize;

    if (y + BUBBLE_SIZE > sh - BASKET_THRESHOLD + BUBBLE_SIZE) {
      // User dropped bubble in basket zone → animate out and close
      bubbleWindow.webContents.send('basket-update', false);
      // Small delay for exit animation
      setTimeout(() => closeBubble(), 200);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (pythonProcess) pythonProcess.kill();
});
