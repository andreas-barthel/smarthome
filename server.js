var WebSocketServer = require('websocket').server;
var http = require('http');

var smartHome = require('./smartHome.js');

var server = http.createServer(function(request, response) {
	// make some fun with request
});
server.listen(smartHome.config.network.listeningPort, smartHome.config.network.listeningIp, function() {});

wsServer = new WebSocketServer({
	httpServer: server
});

wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	 console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
	//smartHome.sessions.clients
	
	connection.on('message', function(message) {
		console.log('<<< ' + message.utf8Data.replace('/\r\n/g', ''));
		var telegram = smartHome.net.telegram.parse(message.utf8Data);
		switch(telegram.type) {
			case 'register':
				smartHome.sessions.register(telegram.mac, connection.socket.remoteAddress, telegram.hwClass, connection);
				break;
			
			case 'event':
				var rules = smartHome.rules.getRules(telegram.mac, telegram.event);
				console.log('found rules: ' + rules.length);
				for(var i=0; i<=rules.length-1; i++) {
					var rule = rules[i];
					console.log('rule: source: ' + rule.source + ', event: ' + rule.event + ', action: ' + rule.action + ', target: ' + rule.target);
					var target = smartHome.sessions.clients[rule.target];
					if(target) {
						console.log('target ' + rule.target + ' online');
						smartHome.rules.processRule(rule.id);
					} else {
						console.log('target ' + rule.target + ' not online');
					}
				}
				break;
			
			default:
				console.log("ignoring unknown telegram: " + message);
				break;
		}
		
	});
	
	connection.on('close', function(connection) {
		
	});
});