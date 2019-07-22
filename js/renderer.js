const {ipcRenderer} = require('electron');

document.getElementById('prgCurrentProgress').value = 50;

// ipcRenderer.on('message', function(event, text) {
//   var container = document.getElementById('messages');
//   var message = document.createElement('div');
//   message.innerHTML = text;
//   container.appendChild(message);
// })