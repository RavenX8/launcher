const {ipcRenderer} = require('electron');

document.getElementById("btn-launch").disabled = true;
document.getElementById("btn-launch").innerHTML = "Updating...";
let processName = "";
let processArgs = [];
let serverIp = "";
let serverPort = "";
let updateList = [];
let currentUpdateIndex = 0;


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

function loadUrl(url) {
  console.log("attempting to loadURL");
  const webview = document.querySelector('#news');
  const loadPage = () => {
    webview.loadURL(url);
    webview.removeEventListener('dom-ready', loadPage);
  };
  webview.addEventListener('dom-ready', loadPage)
}

function updateProgress(cProgress) {
  console.log("progress is " + cProgress);
  var elem = document.getElementById("currentProgress");
  elem.value = cProgress;
}

function checkForUpdate(value) {
  ipcRenderer.sendSync("check-file", value);
  currentUpdateIndex += 1;
  const cleanProgressInPercentages = Math.floor(currentUpdateIndex / updateList.length) * 100;
  updateProgress(cleanProgressInPercentages);
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
  document.getElementById("btn-launch").innerHTML = "Launch!";
}

ipcRenderer.on("download progress", (event, progress) => {
  const cleanProgressInPercentages = Math.floor(progress * 100); // Without decimal point
  updateProgress(cleanProgressInPercentages);
});

ipcRenderer.on("server address update", (event, info) => {
  serverIp = info.ip;
  serverPort = info.port;
});

ipcRenderer.on("download complete", (event, file) => {
  if(file.includes(".zip") == true) {
    ipcRenderer.send("extract file", {filename: file});
  }
});
