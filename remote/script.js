(function (global) {
	'use strict';
	
	var socanvas = global.document.getElementById('sensoroutput');
	var soc = socanvas.getContext('2d');
	var chatMessages = document.getElementById('messages');
	var chatInput = document.getElementById('chatInput');
	
	var sensorvalues = {
		'leftDistance': 0,
		'rightDistance': 0,
		'ambientLight': 0,
		'batteryLevelTank': 0,
		'batteryLevelCrane': 0
	};
	
	var updateSensorValues = function () {
		soc.clearRect(0, 0, socanvas.width, socanvas.height);
		soc.save();
			soc.fillStyle = 'black';

			
			soc.font = "13px sans-serif";

			soc.fillText("Ambient light level:", 0, 11);
			
			soc.save();
				// Ambient light box
				soc.globalAlpha = 1-sensorvalues.ambientLight/1023;
				soc.fillRect(0, 16, 150, 76); // Background
				soc.globalAlpha = 1.0;
				soc.lineWidth = 3;
				soc.strokeRect(1.5, 16.5, 147, 74); // Border

				// Ambient light text
				soc.lineWidth = 1;
				soc.fillStyle = "white";
				soc.strokeStyle = "black";
				soc.font = "bold 30px sans-serif";
				soc.textAlign = "center";
				soc.textBaseline = 'middle';
				soc.fillText(Math.round((sensorvalues.ambientLight/1023)*100)+"%", 75.5, 54);
				soc.strokeText(Math.round((sensorvalues.ambientLight/1023)*100)+"%", 75.5, 54);
			soc.restore();

			soc.fillText("Base battery:", 160, 11);
			soc.fillText("Crane battery:", 160, 58);
			
			soc.save();
				// Battery level values
				soc.fillStyle = 'black';
				soc.font = "bold 16px sans-serif";
				soc.fillText(sensorvalues.batteryLevelTank+" V", 245 , 13);
				soc.fillText(sensorvalues.batteryLevelCrane+" V", 245 , 60);

				// Battery level meters
				soc.fillStyle = "#CCC";
				soc.fillRect(160, 16, 9*15+4, 29);
				soc.fillRect(160, 63, 9*15+4, 29);
				soc.fillStyle = "#3F3";
				soc.fillRect(162, 18, Math.min(sensorvalues.batteryLevelTank, 9)*15, 25);
				soc.fillRect(162, 65, Math.min(sensorvalues.batteryLevelCrane, 9)*15, 25);
			soc.restore();



			soc.save();
				// Ultrasonic sensors
				soc.strokeStyle = 'black';
				soc.strokeRect(0.5, 95.5, 299, 79);

				soc.fillStyle = 'black';
				soc.beginPath();
					soc.rect(0, 96, 300, 78);
					soc.clip();

				soc.fillStyle = '#F00';
				soc.beginPath();
					soc.arc(120, 180, sensorvalues.leftDistance*1.5+6, Math.PI+Math.PI/4, -Math.PI/4, false);
					soc.lineTo(120, 180);
					soc.fill();

				soc.globalCompositeOperation = 'xor';

				soc.fillStyle = '#0C0';
				soc.beginPath();
					soc.arc(180, 180, sensorvalues.rightDistance*1.5+6, Math.PI+Math.PI/4, -Math.PI/4, false);
					soc.lineTo(180, 180);
					soc.fill();

				soc.globalCompositeOperation = 'destination-over';

				soc.fillStyle = 'yellow';
				soc.beginPath();
					soc.arc(180, 180, sensorvalues.rightDistance*1.5+6, Math.PI+Math.PI/4, -Math.PI/4, false);
					soc.lineTo(180, 180);
					soc.fill();

			soc.restore();
			soc.fillText("Distance sensors:", 2, 107);
			


		soc.restore();
	};
	updateSensorValues();
	
	var actions = [
	//	[ action, keycode, stop action, inbox id, robot id]
		['TankForward', 	87, 'TankStop', 0, 0],
		['TankReverse', 	83, 'TankStop', 0, 0],
		['TankLeft', 		65, 'TankStop', 0, 0],
		['TankRight', 		68, 'TankStop', 0, 0],

		['TurnLeft', 	37, 'TurnStop', 0, 1],
		['TurnRight', 	39, 'TurnStop', 0, 1],
		['TiltUp', 		38, 'TiltStop', 0, 1],
		['TiltDown', 	40, 'TiltStop', 0, 1],
		['ClawIn', 		33, 'ClawStop', 0, 1],
		['ClawOut', 	34, 'ClawStop', 0, 1],

		['ColorRed', 	82, 'ColorNone', 2, 0],
		['ColorGreen', 	71, 'ColorNone', 2, 0],
		['ColorBlue', 	66, 'ColorNone', 2, 0],
		['ColorFull', 	70, 'ColorNone', 2, 0]

	];
	
	var buttons = [];
	
	var lastSent = "";
	
	var downListener = function (i) {
		return function (e) {
			actions[i].isHolding = true;
			if(lastSent !== actions[i][0] && ws && ws.readyState === 1) {
				ws.send(JSON.stringify([actions[i][3], actions[i][0], actions[i][4]]));
				lastSent = actions[i][0];
			}
			e.preventDefault();
		};
	};
	var upListener = function (i) {
		return function () {
			if(actions[i].isHolding) {
				actions[i].isHolding = false;
				if(lastSent !== actions[i][2] && ws && ws.readyState === 1) {
					ws.send(JSON.stringify([actions[i][3], actions[i][2], actions[i][4]]));
					lastSent = actions[i][2];
				}
			}
		};
	};
	
	var keyCodes = [];
	
	for(var i=0; i < actions.length; i+=1) {
		buttons[i] = global.document.getElementById('btn_'+actions[i][0]);
		if (!buttons[i]) {
			console.log(actions[i][0]);
		}
		buttons[i].addEventListener('mousedown', downListener(i), false);
		window.addEventListener('mouseup', upListener(i), false);
		keyCodes[i] = actions[i][1];
		actions[i].isHolding = false;
	}
	
	global.addEventListener('keydown', function (e) {
		var kc = e.keyCode;
		var i = keyCodes.indexOf(kc);

		if(i > -1 && e.target === document.body) {
			actions[i].isHolding = true;
			buttons[i].classList.add("holding");
			if(lastSent !== actions[i][0] && ws && ws.readyState === 1) {
				ws.send(JSON.stringify([actions[i][3], actions[i][0], actions[i][4]]));
				lastSent = actions[i][0];
			}
			e.preventDefault();
		}
	}, false);
	global.addEventListener('keyup', function (e) {
		var kc = e.keyCode;
		var i = keyCodes.indexOf(kc);
		if(i > -1 && e.target === document.body) {
			if(actions[i].isHolding) {
				actions[i].isHolding = false;
				buttons[i].classList.remove("holding");
				if(lastSent !== actions[i][2] && ws && ws.readyState === 1) {
					ws.send(JSON.stringify([actions[i][3], actions[i][2], actions[i][4]]));
					lastSent = actions[i][2];
				}
			}
		}
	}, false);
	


	if(!window.WebSocket) window.WebSocket = window.MozWebSocket;
	
	var ws = new WebSocket("ws://djazz.mine.nu:8082");

	addLogMessage('Connecting...');
	
	ws.onopen = function () {
		addLogMessage("Connected!");
	};
	ws.onmessage = function (e) {
		var data = JSON.parse(e.data);
		if(data.sensorvalues !== undefined) {
			sensorvalues.ambientLight = parseInt(data.sensorvalues[0], 10);
			sensorvalues.leftDistance = parseInt(data.sensorvalues[1], 10);
			sensorvalues.rightDistance = parseInt(data.sensorvalues[2], 10);
			updateSensorValues();
		}
		if(data.batterylevel !== undefined) {
			
			if(data.robotId === 0) {
				sensorvalues.batteryLevelTank = data.batterylevel;

			} else {
				sensorvalues.batteryLevelCrane = data.batterylevel;
			}
			
			updateSensorValues();
		}
		if (data.action !== undefined) {
			for (var i = 0; i < actions.length; i++) {
				if (actions[i][0] === data.action) {
					buttons[i].classList.add('active');
					buttons[i].style.outlineColor = "hsla("+data.color+", 100%, 50%, 0.5)";
				} else if (actions[i][2] === data.action) {
					buttons[i].classList.remove('active');
					buttons[i].style.outlineColor = "hsla("+data.color+", 100%, 50%, 0.5)";
				}
			}
		}
		if (data.chat) {

			addLogMessage(data.chat, true, data.color);
		}
		
	};
	ws.onclose = function () {
		console.log("Disconnected");
		addLogMessage("You got disconnected, reload page to reconnect", false, 0);
	};
	ws.onerror = function (e) {
		console.log("Socket error");
	};


	
	
	chatInput.form.addEventListener('submit', function (e) {
		e.preventDefault();
		var msg = chatInput.value;
		if (msg.length > 0 && ws && ws.readyState === 1) {
			chatInput.value = '';
			ws.send(JSON.stringify(msg));
		}
	}, false);

	function addLogMessage (msg, isChat, color) {
		var node = document.createElement('div');
		node.textContent = msg;
		if (!isChat) {
			node.classList.add('log');
		}
		if (color !== undefined) {
			node.style.color = "hsl("+color+", 100%, 40%)";
		}
		chatMessages.appendChild(node);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	};
	
}(window));