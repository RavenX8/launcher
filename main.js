const {app, BrowserWindow, ipcMain} = require('electron');
const {download} = require("electron-dl");
const {log} = require('electron-log');
const {autoUpdater} = require("electron-updater");
const {fs} = require('fs');
const {path} = require('path');
var DecompressZip = require('decompress-zip');

// Make sure javascript doesn't kill our window before we are done with it
let win

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    resizable: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      show: false
    }
  })
  // and load the index.html of the app.
  win.loadFile('html/index.html')

  // Open the DevTools.
  win.webContents.openDevTools()

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

  ipcMain.on("download", (event, info) => {
    info.properties.onProgress = status => win.webContents.send("download progress", status);
    download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
        .then(dl => win.webContents.send("download complete", dl.getSavePath()));
  });

  ipcMain.on("extract file", (event, info) => {
    var unzipper = new DecompressZip(info.file);

    unzipper.on('error', function (err) {
      log.error('Caught an error');
    });

    unzipper.on('extract', function (log) {
      log.info(log);
      // if (fs.existsSync(log.filename)) {
      //   fs.unlink(log.filename, (err) => {
      //       if (err) {
      //           return;
      //       }
      //   });
      // }
    });

    unzipper.extract({
      path: '.',
      filter: function (file) {
          return file.type !== "SymbolicLink";
      }
    });
  });
}

//let working_directory = app.getPath('app')

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

autoUpdater.on('error', message => {
  log.error('There was a problem updating the application')
  log.error(message)
})

// If there aren't any updates, create the window
autoUpdater.on('update-not-available', (ev, info) => {
  createWindow();
})

autoUpdater.on('update-downloaded', (ev, info) => {
  // Wait 5 seconds, then quit and install
  // In your application, you don't need to wait 5 seconds.
  // You could call autoUpdater.quitAndInstall(); immediately
  // setTimeout(function() {
  //   autoUpdater.quitAndInstall();
  // }, 5000)
  autoUpdater.quitAndInstall();
})

app.on('ready', function()  {
  //autoUpdater.checkForUpdates();
  createWindow();
});