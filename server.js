//import connect from 'http2';

var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var smartHome = require('./smartHome.js');

smartHome.database.connect();

var server = http.createServer(function(request, response) {
	var serveUrl = request.url;
	if(serveUrl === '/')
		serveUrl = "/index.html";
	try {
		var site = fs.readFileSync('www' + serveUrl);
		if(serveUrl.endsWith(".html"))
			response.writeHead(200, {'Content-Type': 'text/html'});
		else if(serveUrl.endsWith(".css"))
			response.writeHead(200, {'Content-Type' : 'text/css'});
		response.end(site);
	} catch(err) {
		var error = fs.readFileSync('www/404.html');
		response.writeHead(404, {'Content-Type' : 'text/html'});
		response.end(error);
	}
		
	

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

			case 'fileToDevice':
				var path = telegram.path;
				var content = telegram.content;
				var targetDevice = telegram.targetDevice;
				var client = smartHome.sessions.clients[targetDevice];
				

				var forwardedTelegram = smartHome.templates.messages.updateFile;
				forwardedTelegram.path = path;
				forwardedTelegram.content = content;

				smartHome.net.send(client.connection, forwardedTelegram);
				//console.log(JSON.stringify(forwardedTelegram));

				break;

			case 'getRules':
				smartHome.rules.getAllRules(function(rules) {
					var response = smartHome.templates.messages.response;
					response.action = 'getRules';
					response.value = rules;
					smartHome.net.send(connection, response);
				});
				break;

			case 'getOnlineDevices':

				var clients = smartHome.sessions.getClientsAsList();
				var response = smartHome.templates.messages.response;
				response.action = 'getOnlineDevices';
				response.value = {state: true, devices: clients};
				smartHome.net.send(connection, response);

				break;

			case 'login':
				smartHome.sessions.login(telegram.name, telegram.password, function(err, sid) {
					var response = smartHome.templates.messages.response;					
					response.action = 'login';					
					if(err) {
						response.value = {state: false, err: err};
					} else {
						response.value = {state: true, sid: sid};
					}
					smartHome.net.send(connection, response);
				});
				break;

			case 'saveAdminAccount':
					smartHome.database.saveAdminAccount(telegram.name, telegram.password, function(err){
						if(err) throw err;

						var response = smartHome.templates.messages.response;
						response.action = 'saveAdminAccount';
						response.value = 'OK';
						smartHome.net.send(connection, response);
					});
				break;

			case 'checkConfigState':
				smartHome.settings.getConfig('configState', function(name, value, option) {
					var response = smartHome.templates.messages.response;
					response.action = 'checkConfigState';
					if(name == null)
						response.value = 'NO';
					else
						response.value = 'YES';
					
					smartHome.net.send(connection, response);
					
				});
				break;

			case 'register':
				smartHome.sessions.register(telegram.mac, connection.socket.remoteAddress, telegram.hwClass, connection);
				break;
			
			case 'event':
				try {
					smartHome.rules.getRules(telegram.mac, telegram.event, function(rules) {
						for(var i=0; i<=rules.length-1; i++) {
							var rule = rules[i];
							var target = smartHome.sessions.clients[rule.target];
							if(target) {
								smartHome.rules.processRule(rule);
							} else {
							}
						}
					});
				} catch (err) {
					console.log(err.message);
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