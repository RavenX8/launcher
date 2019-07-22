const {ipcRenderer} = require('electron');
const {log} = require('electron-log');

function updateProgress(cProgress) {
  var elem = document.getElementById("myBar");
  elem.style.width = cProgress + '%';
} 

ipcRenderer.on("download progress", (event, progress) => {
  //const progressInPercentages = progress * 100; // With decimal point and a bunch of numbers
  const cleanProgressInPercentages = Math.floor(progress * 100); // Without decimal point
  if(cleanProgressInPercentages !== 0)
    updateProgress(cleanProgressInPercentages);
});

ipcRenderer.on("download complete", (event, file) => {
  if(file.includes(".zip") == true) {
    ipcRenderer.send("extract file", {
      file: file
    });
  } else if (file === "root.js") {
    console.log('we finished downloading root.js');

    // TODO: Do something with root.js
  }
  //console.log('we finished downloading ' + file);
});

function download_update(url) {
  ipcRenderer.send("download", {
    url: url,
    properties: {directory: "."}
  });
}

ipcRenderer.send("download", {
  url: "https://azgstudio.com/patch/root.js",
  properties: {directory: "."}
});

// ipcRenderer.on('message', function(event, text) {
//   var container = document.getElementById('messages');
//   var message = document.createElement('div');
//   message.innerHTML = text;
//   container.appendChild(message);
// })