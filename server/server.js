

console.log('Loading HTTP module...'); var http = require('http');
console.log('Loading File System module...'); var fs = require('fs');
console.log('Loading NXT Bluetooth module...'); var Nxt = require('mindstorms_bluetooth').Nxt;
console.log('Loading WebSocket module...'); var WebSocketServer = require('ws').Server;
console.log('Loading Child Process module...'); var child_process = require('child_process');
console.log('All modules loaded');




var mainport = 8082;

var tank, crane;

console.log('Connecting to NXT devices...');



function closeProcess() {
	tank && tank.stop_program();
	crane && crane.stop_program();
	setTimeout(function () {
		//rfcomm.kill('SIGINT');
		process.exit(0);
	}, 100); // Wait for the NXT to stop the program
};
process.on('SIGINT', closeProcess);



tank = new Nxt('/dev/rfcomm0');
crane = new Nxt('/dev/rfcomm1');

setTimeout(function () {
	console.log("Starting programs...");
	tank.start_program("tank.rxe");
	crane.start_program("crane.rxe");
}, 8000);



tank.register_callback('messagewrite', function (data) {
	// Got a write callback
});
tank.register_callback('messageread', function (data) {
	var message = data.slice(5, 4+data[4]);
	//console.log("GOT MESSAGE", message.toString().split(","));
	broadcast(JSON.stringify({
		sensorvalues: message.toString().split(","),
		robotId: 0
	}));
});
tank.register_callback('getbatterylevel', function (data) {
	broadcast(JSON.stringify({
		batterylevel: data.readUInt16LE(3)/1000,
		robotId: 0
	}));
});

crane.register_callback('messagewrite', function (data) {
	// Got a write callback
});
crane.register_callback('messageread', function (data) {
	var message = data.slice(5, 4+data[4]);
	//console.log("GOT MESSAGE", message.toString().split(","));
	broadcast(JSON.stringify({
		sensorvalues: message.toString().split(","),
		robotId: 1
	}));
});
crane.register_callback('getbatterylevel', function (data) {
	broadcast(JSON.stringify({
		batterylevel: data.readUInt16LE(3)/1000,
		robotId: 1
	}));
});


setInterval(function () {
	
	// Read from mailbox #1
	tank.message_read(0);
	crane.message_read(0);
	
}, 50);

setInterval(function () {

	// Query the battery level
	tank.get_battery_level();
	crane.get_battery_level();

}, 5*1000);
tank.get_battery_level();
crane.get_battery_level();


var httpserv = http.createServer(function (req, res) {
	switch(req.url) {
		case '/':
			fs.readFile('remote.html', 'utf8', function (err, data) {
				res.writeHead(200, {'content-type': 'text/html'});
				res.end(data);
			});
			break;
		default:
			res.writeHead(404);
			res.end("Greetings programs.\n\n - C.L.U.");
			break;
	}
});
httpserv.listen(mainport, function () {
	console.log("Remote webserver is up on port "+mainport);
});




var wss = new WebSocketServer({
	server: httpserv
});

var sockets = [];
var lastSentAction = "";

var broadcast = function (text) {
	for(var i=0; i < sockets.length; i+=1) {
		if (sockets[i].readyState === 1) {
			sockets[i].send(text);
		}
		
	}
};

wss.on('connection', function (ws) {
	
	var remoteAddress = ws._socket.remoteAddress;
	console.log(remoteAddress+" joined");
	sockets.push(ws);

	ws.on('message', function (message) {
		var data = JSON.parse(message);
		
		var inbox = data[0];
		var action = data[1];
		var robotId = data[2];
		if (action !== lastSentAction) {
			lastSentAction = action;
			var robot = robotId === 0 ? tank : crane;
			robot.message_write(inbox, new Buffer(action));
			console.log(remoteAddress, action, robotId);
		}
		
		
	});

	ws.on('close', function (reasonCode, reasonText) {
		tank.message_write(0, new Buffer("TankStop"));
		crane.message_write(0, new Buffer("TurnStop"));
		crane.message_write(0, new Buffer("TiltStop"));
		crane.message_write(0, new Buffer("ClawStop"));
		
		console.log(remoteAddress+" left");
		var index = sockets.indexOf(ws);

		sockets.splice(index, 1);
	});

	ws.on('error', function () {
		console.log(remoteAddress+" got error");
		var index = sockets.indexOf(ws);

		sockets.splice(index, 1);
	});
});