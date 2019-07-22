const { app, BrowserWindow } = require('electron')
const log = require('electron-log');
const {autoUpdater} = require("electron-updater");

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
  autoUpdater.checkForUpdates();
});