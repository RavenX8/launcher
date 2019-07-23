const {app, BrowserWindow, ipcMain} = require('electron');
const {download} = require("electron-dl");
const {autoUpdater} = require("electron-updater");
const fs = require('fs');
const {spawn} = require('child_process');
var DecompressZip = require('decompress-zip');
var sha256 = require('js-sha256');

// Make sure javascript doesn't kill our window before we are done with it
let win;

function createWindow () {
  // Create the browser window.
  var basepath = app.getAppPath();
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
  win.loadFile('html/index.html', {"extraHeaders" : "pragma: no-cache\n"})

  win.webContents.session.clearCache(function(){
    //some callback.
  });

  // Open the DevTools.
  //win.webContents.openDevTools();

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
    // console.log('got extract file event for \'' + info.filename + '\'');
    var unzipper = new DecompressZip(info.filename);

    unzipper.on('error', function (err) {
      // console.log('Caught an error');
      // console.log(err);
    });

    unzipper.on('progress', function (fileIndex, fileCount) {
      //console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });

    unzipper.on('extract', function (log) {
      if (fs.existsSync(this.filename)) {
        fs.unlink(this.filename, (err) => {if (err) {return;}});
      }
    });

    unzipper.extract({
      filter: function (file) {
          return file.type !== "SymbolicLink";
      }
    });
  });

  ipcMain.on("check-file", (event, info) => {
    if (fs.existsSync(info.filename)) {
      var file_for_update = fs.readFileSync(info.filename);
      var hash = sha256(file_for_update.toString());
      console.log("Hash: '" + hash.toUpperCase() + "'");
      console.log("info.hash: '" + info.hash.toUpperCase() + "'");
      if(hash.toUpperCase() != info.hash.toUpperCase())
      {
        download(BrowserWindow.getFocusedWindow(), info.url, {directory: "."})
          .then(dl => {
            win.webContents.send("download complete", dl.getSavePath())
            event.returnValue = true;
          });
      }
    } else {
      //console.log(info.url);
      //TODO: need to download file now
      download(BrowserWindow.getFocusedWindow(), info.url, {directory: "."})
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
    // console.log("launching game!!!!");
    // console.log(info.processName);
    // console.log(info.processArgs);
    const subprocess = spawn(info.processName, info.processArgs, {
      detached: true,
      stdio: 'ignore'
    });
    subprocess.unref();
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

app.on('ready', function()  {
  //autoUpdater.checkForUpdates();
  createWindow();
});

autoUpdater.on('error', message => {
  console.log('There was a problem updating the application')
  console.log(message)
});

// If there aren't any updates, create the window
autoUpdater.on('update-not-available', (ev, info) => {
  createWindow();
});

autoUpdater.on('update-downloaded', (ev, info) => {
  // Wait 5 seconds, then quit and install
  // In your application, you don't need to wait 5 seconds.
  // You could call autoUpdater.quitAndInstall(); immediately
  //setTimeout(function() {
    autoUpdater.quitAndInstall();
  //}, 1000);
});
