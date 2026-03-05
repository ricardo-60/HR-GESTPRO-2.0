import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Handling ES Modules in Electron
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1366,
        height: 860,
        minWidth: 1024,
        minHeight: 600,
        title: 'HR-GESTPRO 2.0',
        icon: path.join(__dirname, '../build/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Remove standard Menu for a cleaner app look
    mainWindow.setMenuBarVisibility(false);

    // Load the index.html from the Vite build output
    // Depending on DEV or PROD it works differently. Here we point to PROD build.
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
