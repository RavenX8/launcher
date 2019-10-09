const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const {download} = require("electron-dl");
const {autoUpdater} = require("electron-updater");
const Store = require('electron-store');
var DecompressZip = require('decompress-zip');
var sha256 = require('js-sha256');

const devMode = (process.argv || []).indexOf('--dev') !== -1;
const clearConfig = (process.argv || []).indexOf('--first-start') !== -1;

if (devMode) {
  // load the app dependencies
  const PATH_APP_NODE_MODULES = path.join(__dirname, '..', '..', 'app', 'node_modules');
  require('module').globalPaths.push(PATH_APP_NODE_MODULES);
  autoUpdater.updateConfigPath = path.join(__dirname, 'app-update.yml');
}

// Make sure javascript doesn't kill our window before we are done with it
let win;
let gameDirectory;

const schema = {
  gameDir: {
    type: 'string'
  }
}

const store = new Store({schema});
if(clearConfig) {
  store.clear();
}
gameDirectory = store.get('gameDir', '');

function createWindow () {
  let win = new BrowserWindow({
    width: 550,
    height: 600,
    resizable: devMode,
    webPreferences: {
      nodeIntegration: true,
      show: false
    }
  });
  win.setMenu(null);
  // and load the index.html of the app.
  win.loadFile('index.html', {"extraHeaders" : "pragma: no-cache\n"})

  // Open the DevTools.
  if(devMode) win.webContents.openDevTools();

  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  win.once('ready-to-show', () => {
    win.show()
  });

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  ipcMain.on("download", async (event, info) => {
    info.properties.onProgress = status => win.webContents.send("download progress", status);
    download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
        .then(dl => win.webContents.send("download complete", dl.getSavePath()));
  });

  ipcMain.on("extract file", (event, info) => {
    var unzipper = new DecompressZip(info.filename);

    unzipper.on('extract', function (log) {
      fs.unlink(this.filename, (err) => {
        console.log("unlinking " + this.filename);
        if (err) 
        {
          console.log(err);
          return;
        }
      });
    });

    unzipper.extract({
      path: gameDirectory,
      filter: function (file) {
          return file.type !== "SymbolicLink";
      }
    });
  });

  ipcMain.on("check-file", (event, info) => {
    if (fs.existsSync(gameDirectory + info.filename)) {
      var file_for_update = fs.readFileSync(gameDirectory + info.filename);
      var hash = sha256(file_for_update);
      if(devMode) {
        console.log("Hash: '" + hash.toUpperCase() + "'");
        console.log("info.hash: '" + info.hash.toUpperCase() + "'");
      }
      
      if(hash.toUpperCase() != info.hash.toUpperCase())
      {
        download(BrowserWindow.getFocusedWindow(), info.url, {directory: gameDirectory})
          .then(dl => {
            win.webContents.send("download complete", dl.getSavePath())
            event.returnValue = true;
          });
        
      } else {
        event.returnValue = true;
      }
    } else {
      download(BrowserWindow.getFocusedWindow(), info.url, {directory: gameDirectory})
        .then(dl => {
          win.webContents.send("download complete", dl.getSavePath())
          event.returnValue = true;
        });
    }
  });

  ipcMain.on("delete-file", (event, info) => {
    if (fs.existsSync(info.filename)) {
      fs.unlink(info.filename, (err) => {
          if (err) {
            console.log(err);
            return;
          }
      });
    }
  });

  ipcMain.on("launch-game", (event, info) => {
    let needShell = false;
    if (process.platform !== 'win32') {
      info.processName = info.processName.replace('.exe', '.sh');
      needShell = true;
    }
    
    const subprocess = spawn(gameDirectory + info.processName, info.processArgs, {
      cwd: gameDirectory,
      detached: true,
      stdio: 'ignore',
      shell: needShell
    });
    subprocess.unref();
    win.close();
  });
}

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
});

autoUpdater.on('error', (error) => {
  dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString());
  win.close();
});

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: "info",
    message: "Downloading launcher update, please wait."
  }, (response, checkboxChecked) => {
  });
});

autoUpdater.on('update-not-available', (info) => {
  if(gameDirectory == '')
  {
    dialog.showMessageBox({
      type: "info",
      message: "First time install detected, please select your ROSE install directory."
    });

    let picked = dialog.showOpenDialog({
      title: 'Select ROSE Install directory',
      properties: ['openFile'],
      filters: [
        { name: 'TRose', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    let idx = picked[0].lastIndexOf('\\');
    gameDirectory = picked[0].substring(0, idx+1);
    store.set('gameDir', gameDirectory);
  }
  createWindow();
});

autoUpdater.on('update-downloaded', (info) => {
  setTimeout(function() {
    autoUpdater.quitAndInstall();  
  }, 1000)
});

app.on('ready', function() {
  if(devMode == false) {
    autoUpdater.checkForUpdates();
  } else {
    if(gameDirectory == '')
    {
      dialog.showMessageBox({
        type: "info",
        message: "First time install detected, please select your ROSE install directory."
      });

      let picked = dialog.showOpenDialog({
        title: 'Select ROSE Install directory',
        properties: ['openFile'],
        filters: [
          { name: 'TRose', extensions: ['exe'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      console.log(picked);
      let idx = picked[0].lastIndexOf('\\');
      gameDirectory = picked[0].substring(0, idx+1);
      store.set('gameDir', gameDirectory);
    }
    createWindow();
  }
});
