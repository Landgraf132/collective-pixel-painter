var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require("fs");
var sys = require("util");
var tarGzip = require('node-targz');
var winston = require('winston');
var os = require('os-utils');

winston.add(winston.transports.File, {
  filename: 'logFile.log'
});
var debug = false;


app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/client.html');
});
app.get('/test', function(req, res) {
  res.sendFile(__dirname + '/client/test.html');
});
var uptime = 0;
var usersArray = new Map();

var pallete = ["#788084", "#0000fc", "#0000c4", "#4028c4", "#94008c", "#AC0028", "#ac1000", "#8c1800", "#503000", "#007800", "#006800", "#005800", "#004058", "#000000",
  "#bcc0c4", "#0078fc", "#0088fc", "#6848fc", "#dc00d4", "#e40060", "#fc3800", "#e46018", "#ac8000", "#00b800", "#00a800", "#00a848", "#008894", "#2c2c2c",
  "#fcf8fc", "#38c0fc", "#6888FC", "#9c78fc", "#fc78fc", "#fc589c", "#fc7858", "#fca048", "#fcb800", "#bcf818", "#58d858", "#58f89c", "#00e8e4", "#606060",
  "#ffffff", "#a4e8fc", "#bcb8fc", "#dcb8fc", "#fcb8fc", "#F4C0E0", "#f4d0b4", "#fce0b4", "#fcd884", "#dcf878", "#b8f878", "#b0f0d8", "#00f8fc", "#C8C0C0"
];

var pixelSize = 5;
var localPixelSize = pixelSize; //pixelSizeWidthBorder
//1200 500
var canvasMapWidth = Math.floor(1350 / localPixelSize) + 1;
var canvasMapHeight = Math.floor(600 / localPixelSize) + 1;
var canvasMap = new Array(canvasMapWidth);
var alreadyLoadCanvasMap = false;
var backgroundColor = "#f5f5dc";
var cpuLoad = 0;
var readToCanvasFromFile = function(pathToDataFile) {
  winston.log('info', "start read dir data");
  var dataFiles = fs.readdirSync(pathToDataFile);
  dataFiles.sort(function(a, b) {
    return fs.statSync(pathToDataFile + a).mtime.getTime() -
      fs.statSync(pathToDataFile + b).mtime.getTime();
  });

  winston.log('info', dataFiles);
  if (dataFiles.length > 0) {
    var fileLoadName = pathToDataFile + dataFiles[dataFiles.length - 1];
    winston.log('info', "read canvas data file: " + fileLoadName);
    var data = fs.readFileSync(fileLoadName, 'utf-8');
    //fs.unlink(fileLoadName);
    var lines = data.toString().split(',');
    winston.log('info', lines[0]);
    winston.log('info', "lines " + lines.length);
    if (lines.length > 0) {
      alreadyLoadCanvasMap = true;
    }
    if (alreadyLoadCanvasMap) {
      winston.log('info', "Load canvas from file");
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
  winston.log('info', "Create a new canvas");
  for (var i = 0; i < canvasMap.length; ++i) {
    canvasMap[i] = new Array(canvasMapHeight);
    for (var j = 0; j < canvasMap[i].length; ++j) {
      canvasMap[i][j] = backgroundColor;
    }
  }
}
var getTimeLeft = function(userCounts) {
  if (userCounts < 10) {
    return 0;
  }
  if (userCounts < 30) {
    return 1;
  }
  if (userCounts < 60) {
    return 2;
  }
  if (userCounts < 100) {
    return 3;
  }
  if (userCounts < 200) {
    return 4;
  }
  if (userCounts < 250) {
    return 5;
  }
  if (userCounts < 300) {
    return 6;
  }
  if (userCounts < 500) {
    return 7;
  }
  return 8;
}

var start = function() {
  var pathToArchive = "canvasData/"
  var pathToDataFile = "canvasData/data/"
  //load last canvas data
  winston.log('info', "start!!!!!!!!!!!!!!!!!!!!");
  readToCanvasFromFile(pathToDataFile);
}

io.on('connection', function(socket) {

  var ipAddress = socket.handshake.address;
  if (usersArray.get(ipAddress) === undefined) {
    usersArray.set(ipAddress, {
      timeLeft: 0,
      currentTime: 0,
      connectionCounter: 1 //countConnceted
    });

    winston.log('info', 'users online: ' + usersArray.size);
  } else {
    var newCount = usersArray.get(ipAddress).connectionCounter + 1;
    usersArray.set(ipAddress, {
      timeLeft: usersArray.get(ipAddress).timeLeft,
      currentTime: usersArray.get(ipAddress).currentTime,
      connectionCounter: newCount
    });
    winston.log('info', 'user already connected: ' + ipAddress + " " + usersArray.get(ipAddress).connectionCounter);
  }
  socket.emit('send canvas map', canvasMap);
  socket.on('on paint', function(msg) {
    var ipAddress = socket.handshake.address;
    var preCurTime = new Date().getTime();
    if (debug || preCurTime - usersArray.get(ipAddress).currentTime >= usersArray.get(ipAddress).timeLeft * 1000) {
      var data = JSON.parse(msg);
      var curTime = new Date().getTime();
      //  winston.log('info', 'message: ' + data.Xpos + " " + data.Ypos);
      var canDraw = false;

      if (pallete.indexOf(data.Color) != -1) {
        canDraw = true;
      }
      if (canDraw &&
        data.Xpos != null &&
        data.Ypos != null &&
        data.Xpos < canvasMap.length &&
        data.Ypos < canvasMap[0].length &&
        data.Ypos >= 0 && data.Xpos >= 0
      ) {
        //winston.log('info', 'map: ' + canvasMap[data.Xpos][data.Ypos]);
        canvasMap[data.Xpos][data.Ypos] = data.Color;
        io.emit('new point', msg);
        var timeLeft = getTimeLeft(usersArray.size);
        var curTime = new Date().getTime();
        usersArray.set(ipAddress, {
          timeLeft: timeLeft,
          currentTime: curTime
        })
      } else {
        winston.log('info', 'out of map ');
      }

    }
  });
  socket.on('query status data', function() {
    winston.log("query to: " + ipAddress);
    os.cpuUsage(function(v) {
      cpuLoad = Math.floor(v * 100);
      var userOnline = usersArray.size;
      var curTime = 0;
      var timeLeft = 0;
      if (usersArray.get(ipAddress) !== undefined) {

        curTime = new Date().getTime() - usersArray.get(ipAddress).currentTime;
        timeLeft = Math.floor((usersArray.get(ipAddress).timeLeft * 1000 - curTime) / 1000);
      } else {
        winston.info('info', "error not found user with ip: " + ipAddress);
      }

      if (timeLeft < 0) timeLeft = 0;
      socket.emit('update status', JSON.stringify({
        userOnline: userOnline,
        timeLeft: timeLeft,
        cpuLoad: cpuLoad
      }));
    });


  });

  socket.on('disconnect', function() {
    var ipAddress = socket.handshake.address;
    winston.log('info', 'user ' + ipAddress + " try disconnect ");
    if (usersArray.get(ipAddress) !== undefined) {
      var connectCount = usersArray.get(ipAddress).connectionCounter;
      if (connectCount === undefined) {
        connectCount = 1;
      }
      if (connectCount > 0) {
        connectCount--;
        usersArray.set(ipAddress, {
          timeLeft: usersArray.get(ipAddress).timeLeft,
          currentTime: usersArray.get(ipAddress).currentTime,
          connectionCounter: connectCount
        });

      }
      if (connectCount <= 0) {
        winston.log('info', 'user disconnected');
        usersArray.delete(ipAddress);
      } else {
        winston.log('info', 'user not disconnected ' + ipAddress + " conn: " + usersArray.get(ipAddress).connectionCounter);
      }
    } else {
      winston.log('error', 'user not found : ' + ipAddress);
    }

  });
  winston.log('info', 'a user connected IP: ' + ipAddress);
});

http.listen('3000', function() {
  winston.log('info', 'listening on *:3000');
  start();
});

function getUnixTime() {
  return parseInt(new Date().getTime() / 1000)
}

setInterval(function() {
  winston.log('info', 'create archive');
  var formatedDate = getUnixTime();
  var fileName = "canvas.data";
  var pathToSaveFile = "canvasData/data/";

  fs.open(pathToSaveFile + fileName, "w+", 0644, function(err, file_handle) {
    if (!err) {

      fs.write(file_handle, canvasMap, null, 'ascii', function(err, written) {
        if (!err) {
          fs.close(file_handle, function(error) {
            if (error) {
              winston.log('info', "ошибка при закрытии файла!");
            }
          });
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
            //  fs.unlink(pathToSaveFile + fileName);
            winston.log('info', "записали, запаковали");
          });
        } else {
          winston.log('info', "ошибка при записи в файл!");
        }

      });


    } else {
      winston.log('info', "Произошла ошибка при открытии");
    }
  });

  var pathCpuLoadFile = "cpuLoad.txt";
  var userPerCpuStr = usersArray.size + "," + cpuLoad + '\n';
  fs.open(pathCpuLoadFile, "a+", 0644, function(err, file_handle) {
    if (!err) {
      fs.write(file_handle, userPerCpuStr, null, 'ascii', function(err, written) {
        if (!err) {
          fs.close(file_handle, function(error) {
            if (error) {
              winston.log('info', "ошибка при закрытии файла!");
            }
          });
        }
      });
    }
  });


}, 60000);
//30000

//update Status
setInterval(function() {

  io.emit('query update status');

}, 1000);

//костыль для NanUser
setInterval(function() {
  var usersDeleteArray = [];
  for (var [key, value] of usersArray.entries()) {
    if (value.connectionCounter === NaN) {
      usersDeleteArray.push(key);
    }
    for (var i = 0; i < usersDeleteArray.length; ++i) {
      usersArray.delete(usersDeleteArray[i]);
    }
  }

}, 1000);
