var myConfig = require('./config.js')
var orm = require('orm');

var smartHome = {
	
	config: myConfig,
	
	templates: {
		messages: {
			ping: {
				type: "PING"
			},
			
			toggleBoolean: {
				type: "toggleBoolean"
			},
			
			BooleanState: {
				type: 'BooleanState',
				state: null
			}
			
		},
		
		getMessageByAction: function(action) {
			if(smartHome.templates.messages[action])
				return smartHome.templates.messages[action];
			
			return null;
		}
	},

	model: {
		Rule: require('./models/Rule.js')
	},

	database: {
		connector: null,
		connect: function() {
			orm.connect("mysql://" + smartHome.config.database.username + ':' + smartHome.config.database.password + '@' + smartHome.config.database.host + '/' + smartHome.config.database.name, function(err, db) {
				if(err) throw err;
				smartHome.database.connector = db;
				smartHome.model.Rule = smartHome.database.connector.define('Rule', smartHome.model.Rule, {}, {});
				smartHome.database.connector.sync();
			});
		}
	},
	
	sessions: {
		clients: {
			
		},
		
		register: function(mac, ip, hwClass, connection) {
			smartHome.sessions.clients[mac] = {
				mac: mac,
				ip: ip,
				hwClass: hwClass,
				connection: connection
			}
			console.log("registering new device: hwClass: " + hwClass + ", mac: " + mac + ", ip: " + ip);
		},
		
		remove: function(clientInfo) {
			if(smartHome.tools.isIp(clientInfo))
				smartHome.sessions.removeIp(clientInfo);
			else
				smartHome.sessions.removeMac(clientInfo);
		},
		
		removeMac: function(mac) {
			delete smartHome.sessions.clients['mac'];
		},
		
		removeIp: function(ip) {
			var client = smartHome.sessions.getClientWithIp(ip);
			smartHome.sessions.removeMac(client.mac);
		},
		
		getClientWithIp: function(ip) {
			Object.keys(smartHome.sessions.clients).forEach(function(mac) {
				var client = smartHome.sessions.clients['mac'];
				if(client.ip == ip)
					return client;
			});
		}
	},
	
	net: {
		telegram: {
			parse: function(telegram) {
				return JSON.parse(telegram);
			}
		},
		
		sendMessage: function(client, action) {
			console.log('in sendMessage: client: ' + client + ', action: ' + action);
			var messageTemplate = smartHome.templates.getMessageByAction(action);
			console.log('messageTemplate: ' + messageTemplate);
			
			if(messageTemplate != null) {
				var message = JSON.stringify(messageTemplate);
				console.log('message: ' + message);
				client.connection.sendUTF(message);
				console.log('>>> ' + message);
			}
				
		}
	},
	
	tools: {
		isIp: function(someString) {
			if(someString.split('.').length != 4)
				return false;
			
			return true;
		}
	},
	
	rules: {
		ruleSet: [
			{
				id: '5000',
				source: '60:01:94:3c:c8:2b',
				event: 'switchStateChanged',
				action: 'toggleBoolean',
				target: '2c:3a:e8:0b:58:ac'
			}
		],
		
		getRuleById: function(id) {
			for(var i=0; i<=smartHome.rules.ruleSet.length-1; i++) {
				var rule = smartHome.rules.ruleSet[i];
				if(rule.id == id)
					return rule;
			}
			
			return null;
		},
		
		getRules: function(mysource, myevent, cb) {
			smartHome.model.Rule.find({ source: mysource, event: myevent}, function(err, foundRules) {
				console.log("bla");
				if(err) throw err;
				console.log("no errors on db fetch")
				console.log("count: " + foundRules.length);
				cb(foundRules);

			});

			/*
			var rules = [];
			for(var i=0; i <= smartHome.rules.ruleSet.length-1; i++) {
				var rule = smartHome.rules.ruleSet[i];
				if(rule.source == source && rule.event == event)
					rules.push(rule);
			}
			*/
			
			return rules;
		},
		
		processRule: function(id) {
			var rule = smartHome.rules.getRuleById(id);
			if(rule == null)
				console.log('rule with id ' + id + ' not found');
			else {
				var client = smartHome.sessions.clients[rule.target];
				smartHome.net.sendMessage(client, rule.action);
			}
		}
	}
};

module.exports = smartHome;

//module.exports = {
//	smartHome : smartHome
//};