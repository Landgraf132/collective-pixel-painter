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
// app.get('/bot', function(req, res) {
//   res.sendFile(__dirname + '/client/bot.html');
// });
var uptime = 0;
var usersArray = new Map();



var pixelSize = 5;
var localPixelSize = pixelSize + 2; //pixelSizeWidthBorder
//1200 500
var canvasMapWidth = Math.floor(1200 / localPixelSize) + 1;
var canvasMapHeight = Math.floor(500 / localPixelSize) + 1;
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
    return 1;
  }
  if (userCounts < 30) {
    return 2;
  }
  if (userCounts < 60) {
    return 5;
  }
  if (userCounts < 100) {
    return 10;
  }
  if (userCounts < 200) {
    return 20;
  }
  if (userCounts < 300) {
    return 30;
  }
  return 40;
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
      countConnceted: 1
    });
    winston.log('info', 'a user connected IP: ' + ipAddress);
  } else {
    var alreadyCon = usersArray.get(ipAddress).countConnceted + 1;
    usersArray.set(ipAddress, {
      timeLeft: usersArray.get(ipAddress).timeLeft,
      currentTime: usersArray.get(ipAddress).currentTime,
      countConnceted: alreadyCon
    });
    winston.log('info', 'user already connected: ' + ipAddress + " " + usersArray.get(ipAddress).countConnceted);
  }
  socket.emit('send canvas map', canvasMap);
  socket.on('on paint', function(msg) {
    var ipAddress = socket.handshake.address;
    var preCurTime = new Date().getTime();
    if (debug || preCurTime - usersArray.get(ipAddress).currentTime >= usersArray.get(ipAddress).timeLeft * 1000) {
      var data = JSON.parse(msg);
      var curTime = new Date().getTime();
      //  winston.log('info', 'message: ' + data.Xpos + " " + data.Ypos);

      if (data.Xpos != null &&
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
    if (usersArray.get(ipAddress) !== undefined) {
      if (usersArray.get(ipAddress).countConnceted > 1) {
        usersArray.set(ipAddress, {
          timeLeft: usersArray.get(ipAddress).timeLeft,
          currentTime: usersArray.get(ipAddress).currentTime,
          countConnceted: usersArray.get(ipAddress).countConnceted - 1
        });
        winston.log('info', 'user ' + ipAddress + " decrement connect " + usersArray.get(ipAddress).countConnceted);
      } else {
        winston.log('info', 'user disconnected');
        usersArray.delete(ipAddress);
      }
    } else {
      winston.log('error', 'user not found : ' + ipAddress);
    }

  });

});

http.listen('3000', function() {
  winston.log('info', 'listening on *:3000');
  start();
});

setInterval(function() {
  winston.log('info', 'create archive');
  var now = new Date();
  var formatedDate = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + "-" + now.getHours() + "-" + now.getMinutes() + now.getSeconds();
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
  var userPerCpuStr = usersArray.size+","+cpuLoad+'\n';
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


}, 100000);
//30000

//update Status
setInterval(function() {

  io.emit('query update status');

}, 1000);
