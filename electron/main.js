import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

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
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            zoomFactor: 1.0
        },
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

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

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
