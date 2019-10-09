const {ipcRenderer} = require('electron');

//TODO: clean up this js file as it looks ugly!


document.getElementById("btn-launch").disabled = true;
document.getElementById("btn-launch").innerHTML = "Checking updates";
let processName = "";
let processArgs = [];
let serverIp = "";
let serverPort = "";
let updateList = [];
let currentUpdateIndex = 0;

var newsArray = [];
const maxVisibleNews = 10;
var currentNewsPage = 0;
var maxPages = 0;

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

const newsArea = document.getElementById('NewsArea');
const newsPageLinks = document.getElementById('NewsPageLinks');

function appendNews(id, element) {
  const table = document.createElement('table');
  table.setAttribute("cellspacing", "0");
  table.setAttribute("cellpadding", "0");
  table.setAttribute("align", "center");
  table.className = "NewsContent";

  const header = document.createElement('tr');
  header.className = "NewsContentHeader";

  const number = document.createElement('td');
  const type = document.createElement('td');
  const title = document.createElement('td');
  const date = document.createElement('td');
  number.className = "ColNo";
  type.className = "ColType";
  title.className = "ColTitle";
  date.className = "ColDate";

  number.innerHTML = id;
  type.innerHTML = element['type'];
  title.innerHTML = element['title'];
  date.innerHTML = element['date'].split(" ")[0];
  
  header.appendChild(number);
  header.appendChild(type);
  header.appendChild(title);
  header.appendChild(date);

  const body = document.createElement('tr');
  body.className = "NewsContentBody";
  const description = document.createElement('td');
  description.setAttribute("colspan", "4");
  description.innerHTML = element['body'];
  body.appendChild(description);

  table.appendChild(header);
  table.appendChild(body);

  newsArray.push(table);
}

const http = require('https');
http.get(
  'https://azgstudio.com/patch/news.php', (resp) => {
    let data = '';
    // A chunk of data has been recieved.
    resp.on('data', (chunk) =>{
      data += chunk;
    });
    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      let news = JSON.parse(data);
      for(i = news.length-1; i >= 0; i--)
      {
        appendNews(i+1, news[i]);
      }
      maxPages = 1 + Math.floor((newsArray.length / maxVisibleNews));
      showNews(0);
      doUpdate();
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});

function doUpdate() {
  http.get(
    'https://azgstudio.com/patch/root.js', (resp) => { // TODO: replace this with a JSON object?
      let data = '';
      // A chunk of data has been recieved.
      resp.on('data', (chunk) =>{
        data += chunk;
      });
      
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        let patchScript = document.createElement("script");
        patchScript.text = data;
        document.head.appendChild(patchScript);
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

function updatePageLinks() {
  while (newsPageLinks.hasChildNodes()) {
    newsPageLinks.removeChild(newsPageLinks.lastChild);
  }

  let startIdx = currentNewsPage-2;
  let endIdx = currentNewsPage+3;

  if(startIdx < 0) startIdx = 0;
  if(endIdx > maxPages) endIdx = maxPages;

  for(let i=startIdx; i < endIdx; i++)
  {
    let page;
    if (i == currentNewsPage) {
      page = document.createElement('span');
      page.id = "PagesButtonVisited";
    } else {
      page = document.createElement('a');
      page.href = "javascript:void(0);";
      page.setAttribute("onclick", "showNews(" + i + ");");
      page.className = "PagesButtonLink";
    }
    page.innerHTML = (i+1);
    newsPageLinks.appendChild(page);
  }
}

function showNews(showPage = 0) {
  while (newsArea.hasChildNodes()) {
    newsArea.removeChild(newsArea.lastChild);
  }

  let startIdx = (maxVisibleNews*showPage);
  let endIdx = (maxVisibleNews*showPage)+maxVisibleNews;
  for(let i = startIdx; i < newsArray.length && i < endIdx; ++i)
  {
    newsArea.appendChild(newsArray[i]);
  }
  currentNewsPage = showPage;
  updatePageLinks();
  setNewsStyle();
}

function prevPage(count = 1) {
  let newPageId = currentNewsPage - count;
  if (newPageId < 0) newPageId = 0;
  if (newPageId > maxPages) newPageId = maxPages;
  showNews(newPageId);
}

function nextPage(count = 1) {
  let newPageId = currentNewsPage + count;
  if (newPageId < 0) newPageId = 0;
  if (newPageId > maxPages) newPageId = maxPages;
  showNews(newPageId);
}

function updateProgress(cProgress) {
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
  document.getElementById("btn-launch").innerHTML = "Launch";
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
