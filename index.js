var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require("fs");
var sys = require("util");
var tarGzip = require('node-targz');

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/client.html');
});

var pixelSize = 5;
var localPixelSize = pixelSize + 2; //pixelSizeWidthBorder
//1200 500
var canvasMapWidth = Math.floor(1200 / localPixelSize) + 1;
var canvasMapHeight = Math.floor(500 / localPixelSize) + 1;
var canvasMap = new Array(canvasMapWidth);
var alreadyLoadCanvasMap = false;
var backgroundColor = "#f5f5dc";

var readToCanvasFromFile = function(pathToDataFile) {
  console.log("start read dir data");
  var dataFiles = fs.readdirSync(pathToDataFile);
  console.log(dataFiles);
  if (dataFiles.length > 0) {
    var fileLoadName = pathToDataFile + dataFiles[dataFiles.length - 1];
    console.log("read canvas data file: " + fileLoadName);
    var data = fs.readFileSync(fileLoadName, 'utf-8');
    fs.unlink(fileLoadName);
    var lines = data.toString().split(',');
    console.log(lines[0]);
    console.log("lines " + lines.length);
    if (lines.length > 0) {
      alreadyLoadCanvasMap = true;
    }
    if (alreadyLoadCanvasMap) {
      console.log("Load canvas from file");
      var count = 0;
      for (var i = 0; i < canvasMap.length; ++i) {
        canvasMap[i] = new Array(canvasMapHeight);
        for (var j = 0; j < canvasMap[i].length; ++j) {
          canvasMap[i][j] = lines[count];
          count++;

        }
      }
      return;
    }



  }

  console.log("Create a new canvas");
  for (var i = 0; i < canvasMap.length; ++i) {
    canvasMap[i] = new Array(canvasMapHeight);
    for (var j = 0; j < canvasMap[i].length; ++j) {
      canvasMap[i][j] = backgroundColor;

    }
  }
}

var start = function() {
  var pathToArchive = "canvasData/"
  var pathToDataFile = "canvasData/data/"
  //load last canvas data
  var arhives = fs.readdirSync(pathToArchive);
  var archiveLoadName = "canvasData/" + arhives[arhives.length - 2];
  var loadFileComplete = false;
  console.log(arhives);
  console.log("fileName:" + archiveLoadName);
  if (arhives.length - 2 > 0) {
    tarGzip.decompress({
      source: archiveLoadName,
      destination: 'canvasData/data/'
    }, function() {
      loadFileComplete = true;
    });
    ///

    ///
  }
  readToCanvasFromFile(pathToDataFile);
}

io.on('connection', function(socket) {
  console.log('a user connected');
  socket.emit('send canvas map', canvasMap);
  socket.broadcast.emit('send canvas map', canvasMap);

  socket.on('on paint', function(msg) {
    var data = JSON.parse(msg);

    console.log('message: ' + data.Xpos + " " + data.Ypos);

    if (data.Xpos!=null &&
       data.Ypos != null &&
      data.Xpos < canvasMap.length &&
      data.Ypos < canvasMap[0].length) {
      console.log('map: ' + canvasMap[data.Xpos][data.Ypos]);
      canvasMap[data.Xpos][data.Ypos] = data.Color;
      io.emit('new point', msg);
    } else {
      console.log('out of map ');
    }
  });



  socket.on('disconnect', function() {
    console.log('user disconnected');
  });

});

http.listen(3000, function() {
  console.log('listening on *:3000');
  start();
});

setInterval(function() {
  var now = new Date();
  var formatedDate = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + "-" + now.getHours() + "-" + now.getMinutes() + now.getSeconds();
  var fileName = formatedDate + ".data";
  var pathToSaveFile = "canvasData/data/";

  fs.open(pathToSaveFile + fileName, "w+", 0644, function(err, file_handle) {
    if (!err) {

      fs.write(file_handle, canvasMap, null, 'ascii', function(err, written) {});

      //tarGzip
      tarGzip.compress({
        source: pathToSaveFile,
        destination: "canvasData/" + formatedDate + ".tar.gz",
        level: 6, // optional
        memLevel: 6, // optional
        options: { // options from https://github.com/mafintosh/tar-fs
          entries: [fileName]
        }
      }, function() {
        fs.unlink(pathToSaveFile + fileName);
        console.log("записали запаковали");
      });

    } else {
      console.log("Произошла ошибка при открытии");
    }
  });



}, 100000);
//30000
