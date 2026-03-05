import { app, BrowserWindow, powerSaveBlocker } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 1. Disable hardware acceleration to avoid GPU sleep issues (White Screen)
app.disableHardwareAcceleration();

let psbId = null;

// Handling ES Modules in Electron
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function createWindow() {
    let windowState = { width: 1366, height: 860 };
    try {
        if (fs.existsSync(stateFilePath)) {
            windowState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load window state', e);
    }

    const mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 1024,
        minHeight: 600,
        title: 'HR-GESTPRO 2.0',
        icon: path.join(__dirname, '../build/icon.png'),
        backgroundColor: '#0f172a', // Avoid white screen flash during load
        show: false, // Show only when ready
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            zoomFactor: 1.0,
            backgroundThrottling: false // Prevent aggressive Chrome throttling
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Zoom Shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key === '+') {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5);
        }
        if (input.control && input.key === '-') {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5);
        }
        if (input.control && input.key === '0') {
            mainWindow.webContents.setZoomLevel(0);
        }
    });

    mainWindow.setMenuBarVisibility(false);

    const saveState = () => {
        const bounds = mainWindow.getBounds();
        fs.writeFileSync(stateFilePath, JSON.stringify(bounds));
    };

    mainWindow.on('resize', saveState);
    mainWindow.on('move', saveState);

    // 2. Force Repaint on Restore to fix White Screen
    mainWindow.on('restore', () => {
        mainWindow.webContents.invalidate();
        // Small hack: nudge size to force Chromium to redraw
        const [w, h] = mainWindow.getSize();
        mainWindow.setSize(w, h + 1);
        mainWindow.setSize(w, h);
    });

    mainWindow.on('focus', () => {
        mainWindow.webContents.invalidate();
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    // 3. Prevent App from sleeping too aggressively
    psbId = powerSaveBlocker.start('prevent-app-suspension');

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
