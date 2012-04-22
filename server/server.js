function inArray(elem, array) {
  for (var i=0; i < array.length; i++) {
    if (i in array && array[ i ] === elem) {
      return true;
    }
  }
  return false;
}

function get(nom, list) {
  // @returns index
  for (var i=0; i<list.length; i++) {
    if (nom == list[i]) return i;
  }
  return -1;
}

var groups = {};
var groupstatus = {};
var connections = [];
io.sockets.on('connection', function (socket) {
  var ip = socket.handshake.address.address;
  if (ip.indexOf('192.168') == 0) { //local IP
    ip = "lan";
  }
  if (groups[ip]) {
    groups[ip][groups[ip].length] = socket;
  } else {
    groups[ip] = [socket];
    groupstatus[ip] = {started:false, url: "", volume:0, curTime:0,paused:false, muted:false, canPlay: 0};
  }
  if (groupstatus[ip].started) {
    socket.emit('denyandclose');
  }
  function broadcast() {
    for (var i=0; i<groups[ip].length; i++) {
      groups[ip][i].emit('groupstate', {number: groups[ip].length});
    }
    if (groups[ip].length == 0) {
      delete groupstatus[ip];
      delete groups[ip];
    }
  }
  var hashadfalse = false;
  function checkAll() {console.log(groupstatus[ip].canPlay, groups[ip].length);
    if (groupstatus[ip].canPlay == groups[ip].length) {
      for (var i=0; i<groups[ip].length; i++) {
         groups[ip][i].emit('groupaction', {start:true});
      }
    }
  }
  broadcast();
  socket.on('canplay', function () {
    groupstatus[ip].canPlay += 1;
    checkAll();
  });
  socket.on('pause', function (time) {
    groupstatus[ip].curTime = time;
    groupstatus[ip].paused = true;
    for (var i=0; i<groups[ip].length; i++) {
      groups[ip][i].emit('groupaction',{pause:true,curTime: time});
    }
  });
  socket.on('play', function (time) {
    groupstatus[ip].curTime = time;
    groupstatus[ip].paused = false;
    for (var i=0; i<groups[ip].length; i++) {
      groups[ip][i].emit('groupaction',{play:true, curTime: time});
    }
  });
  socket.on('seeked', function (time) {
    groupstatus[ip].curTime = time;
    groupstatus[ip].paused = false;
    for (var i=0; i<groups[ip].length; i++) {
      groups[ip][i].emit('groupaction',{seeked:true, curTime: time});
    }
  });
  socket.on('volume', function (arr) {
    groupstatus[ip].muted = arr[1];
    groupstatus[ip].volume = arr[0];
    for (var i=0; i<groups[ip].length; i++) {
      groups[ip][i].emit('groupaction',{volume:true, muted: arr[1], vol: arr[0]});
    }
  });
  socket.on('disconnect', function () {
    var current = groups[ip];
    for (var i=0; i<current.length; i++) {
      if (current[i] == socket) {
        groups[ip].splice(i,1);
      }
    }
    broadcast();
  });
  socket.on('load', function (what) {
    console.log("STARTING",what);
    groupstatus[ip].started = true;
    groupstatus[ip].url = what.url;
    for (var i=0; i<groups[ip].length; i++) {
      groups[ip][i].emit('groupaction', {loadURL: what.url});
    }
  });
  var currentUser = false;
  var currentGroup = false;
});
