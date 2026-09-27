const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 780,
    minWidth: 400,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#09090b',
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    titleBarStyle: 'hidden',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    killPython();
  });
}

async function startPythonBackend() {
  // Check if server is already running
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('Python backend already running, skipping spawn.');
          resolve(true);
        } else {
          reject(new Error('Bad status'));
        }
      });
      req.on('error', reject);
      req.setTimeout(1000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
    return; // Already running
  } catch (e) {
    // Not running, start it
  }

  const backendDir = path.join(__dirname, '..', 'backend');
  const venvPython = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');
  const serverScript = path.join(backendDir, 'server.py');
  
  // Try venv python first, fallback to system python
  const pythonCmd = require('fs').existsSync(venvPython) ? venvPython : 'python';

  console.log(`Starting Python backend: ${pythonCmd} ${serverScript}`);

  pythonProcess = spawn(pythonCmd, [serverScript], {
    cwd: backendDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    console.log(`[Python] ${msg}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('python-log', msg);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    console.error(`[Python Error] ${msg}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pythonProcess = null;
  });
}

function killPython() {
  if (pythonProcess) {
    try {
      // On Windows, SIGTERM doesn't work reliably. Use taskkill.
      if (process.platform === 'win32') {
        require('child_process').execSync(`taskkill /pid ${pythonProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (e) {
      // Process may already be dead
    }
    pythonProcess = null;
  }
}

// IPC handlers for window controls
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

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
  startPythonBackend();
  
  // Give the Python server a moment to start
  setTimeout(createWindow, 1500);
});

app.on('window-all-closed', () => {
  killPython();
  app.quit();
});

app.on('before-quit', () => {
  killPython();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
