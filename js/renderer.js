const {ipcRenderer} = require('electron');
const {log} = require('electron-log');

document.getElementById("btn-launch").disabled = true;
let processName = "";
let processArgs = [];
let serverIp = "";
let serverPort = "";


var serverString = null;
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function()
{
  if (this.status == 200)
  {
    serverString = xhttp.responseText;
    var textByLine = serverString.split(":");

    if(textByLine.length >= 2) {
      serverIp = textByLine[0];
      serverPort = textByLine[1];
    }
  }
};
xhttp.open("GET", "https://azgstudio.com/get_serverip.php", true);
xhttp.send();


function updateProgress(cProgress) {
  var elem = document.getElementById("myBar");
  elem.style.width = cProgress + '%';
}

function checkForUpdate(value) {
  ipcRenderer.sendSync("check-file", value);
}

function download_update(url) {
  ipcRenderer.send("download", {
    url: url,
    properties: {directory: "."}
  });
}

function send_launch() {
  for(var idx = 0; idx < processArgs.length; idx++)
  {
    if(processArgs[idx] == '$SERVER_IP') {
      processArgs[idx] = serverIp;
    } else if(processArgs[idx] == '$SERVER_PORT') {
      processArgs[idx] = serverPort;
    }
  }

  ipcRenderer.send('launch-game', {
    processName: processName,
    processArgs: processArgs
  });
}

function update_complete() {
  document.getElementById("btn-launch").disabled = false;
}

ipcRenderer.on("download progress", (event, progress) => {
  const cleanProgressInPercentages = Math.floor(progress * 100); // Without decimal point
  if(cleanProgressInPercentages !== 0)
    updateProgress(cleanProgressInPercentages);
});

ipcRenderer.on("server address update", (event, info) => {
  serverIp = info.ip;
  serverPort = info.port;
});

ipcRenderer.on("download complete", (event, file) => {
  if(file.includes(".zip") == true) {
    console.log('sending \'extract file\' event for \'' + file + '\'');
    ipcRenderer.send("extract file", {filename: file});
  }
  else {
    console.log('we finished downloading ' + file);
  }
});

// ipcRenderer.on('message', function(event, text) {
//   var container = document.getElementById('messages');
//   var message = document.createElement('div');
//   message.innerHTML = text;
//   container.appendChild(message);
// })