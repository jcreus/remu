Function.prototype.bind = function(scope) {
	var _function = this;
	
	return function() {
		return _function.apply(scope, arguments);
	}
}

function callback() {
	var all = document.getElementsByClassName("vcenter");
	for (var i=0; i<all.length; i++) {
		all[i].style.marginTop = (all[i].parentNode.offsetHeight-all[i].offsetHeight-20)/2;
	}
}
window.addEventListener('load', callback);
window.addEventListener('resize', callback);

remu = {};

remu.openView = function (v) {
	var a = document.getElementsByClassName("view");
	for (var i=0; i<a.length; i++) {
		a[i].style.display = 'none';
	}
	document.getElementById(v).style.display = 'block';
	callback();
}

remu.users = [];
remu.currentUser = "";
remu.lastTimeUpdate = 0;

remu.permAsk = function (user) {
	remu.socket.emit('permask', {userName: user});
	remu.openView('wait');
};
remu.connect = function () {
	if (localStorage.skipped) remu.openView('curgroup');
	remu.socket = io.connect('http://remu.nodester.com',{port:80, rememberTransport: false});
	remu.socket.on('groupstate', function (r) {
		document.getElementById("connections").innerHTML = (r.number == 1) ? "is one connection" : "are "+r.number+" connections";
	});
	remu.socket.on('groupaction', function (what) {
		if (what.loadURL) {
			document.getElementById("loader").style.display = 'none'; callback();
			remu.audio = document.createElement('audio');
			remu.audio.addEventListener('error', function () {
				var text;
				var err = remu.audio.error;
				switch (err.code) {
					case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
						text = "The media type requested is not supported.";
						break;
					case err.MEDIA_ERR_NETWORK:
						text = "A network error has occurred. Please try again or check your connection.";
						break;
					default:
						text = "An error has occurred.";
						break;
				}
				document.getElementById("error").style.display = 'block';
				document.getElementById("errorwhat").innerHTML = text;
				callback();
			});
			remu.audio.src = what.loadURL;
			remu.audio.addEventListener("canplaythrough", function () {console.log("canplay");
				remu.socket.emit('canplay');
			});
			remu.audio.controls = "controls";
			remu.audio.preload = "auto";
			remu.audio.load();
			document.getElementById("audioplayer").appendChild(remu.audio);
			remu.audio.addEventListener("pause", function () {
				remu.socket.emit('pause', remu.audio.currentTime);
			});
			remu.audio.addEventListener("play", function () {
				remu.socket.emit('play', remu.audio.currentTime);
			});
			remu.audio.addEventListener("volumechange", function () {
				remu.socket.emit('volume', [remu.audio.volume, remu.audio.muted]);
			});
		} else if (what.start) {
			document.getElementById("waiting").style.display = 'none';
			document.getElementById("player").style.display = 'block';
			callback();
			remu.audio.play();
			remu.audio.addEventListener("timeupdate", function () {
				if ((remu.audio.currentTime-remu.lastTimeUpdate) > 1.5)remu.socket.emit('seeked', remu.audio.currentTime);
				remu.lastTimeUpdate = remu.audio.currentTime;
	return true;
			});
		} else if (what.pause) {
			//remu.audio.currentTime = what.curTime;
			remu.audio.pause();
		} else if (what.play) {
			remu.audio.currentTime = what.curTime;
			remu.audio.play();
		} else if (what.volume) {
			remu.audio.muted = what.muted;
			remu.audio.volume = what.vol;
		} else if (what.seeked) {
			if (remu.audio.currentTime !== what.curTime) { remu.audio.currentTime = what.curTime; remu.audio.play(); }
		}
	});
	remu.socket.on('denyandclose', function () {
		remu.socket.disconnect();
		document.getElementById("connstatus").innerHTML = "Access denied to group. The music is already loaded.";
		document.getElementById("loader").style.display = 'none';
		callback();
	});
	document.getElementById("url").onkeydown = function (e) {
		if ((e.which||e.keyCode) == 13) {
			remu.URLchosen();
		}
	}
}

remu.showInGroup = function () {
	remu.openView('curgroup');
	localStorage.skipped = true;
}

remu.loadURL = function (url) {
	remu.socket.emit('load', { url : url } );
}

remu.URLchosen = function () {
	document.getElementById("loader").style.display = 'none';
	document.getElementById("waiting").style.display = 'block';
	callback();
	remu.loadURL(document.getElementById('url').value);
}

window.onload = remu.connect;
