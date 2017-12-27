var myConfig = require('./config.js')
var orm = require('orm');
var $ = require('jQuery');

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
			},

			updateFile: {
				type: 'updateFile',
				path: null,
				content: null
			},

			reboot: {
				type: 'reboot'
			},

			response: {type: 'response', action: null, value: null}
			
		},
		
		getMessageByAction: function(action) {
			if(smartHome.templates.messages[action])
				return smartHome.templates.messages[action];
			
			return null;
		}
	},

	model: {
		User: null,
		Settings: null,
		Rule: null,
		Session: null
	},

	settings: {
		getConfig: function(searchName, cb) {
			smartHome.model.Settings.find({name: searchName}, function(err, settings) {
				if(err) throw err;
				console.log('found settings: ' + settings.length);
				if(settings.length == 1)
					cb(settings[0]['name'], settings[0]['value'], settings[0]['option']);
				if(settings.length == 0)
					cb(null, null, null);
				
				// what if more than one setting with same name available?
			});
		}
	},

	database: {
		connector: null,
		connect: function() {
			orm.connect("mysql://" + smartHome.config.database.username + ':' + smartHome.config.database.password + '@' + smartHome.config.database.host + '/' + smartHome.config.database.name, function(err, db) {
				if(err) throw err;

				db.load('./models', function (err) {
					smartHome.model.Rule = db.models.Rule;
					smartHome.model.User = db.models.User;
					smartHome.model.Session = db.models.Session;
					smartHome.model.Settings = db.models.Settings;
				});

				//smartHome.model.Rule = smartHome.database.connector.define('Rule', smartHome.model.Rule, {}, {});
				//smartHome.model.User = smartHome.database.connector.define('User', smartHome.model.User, {}, {});
				//smartHome.model.Settings = smartHome.database.connector.define('Settings', smartHome.model.Settings, {}, {});
				//smartHome.model.Session = smartHome.database.connector.define('Session', smartHome.model.Session, {}, {});
				db.sync();
				smartHome.database.connector = db;
			});
		},

		saveAdminAccount: function(name, password, cb) {
			smartHome.model.User.create({id: 1, name: name, password: password, type: 'admin'}, function(err) {
				if(!err)
					smartHome.model.Settings.create({name: 'configState', value: 'true', option: 'none'}, function(err) {
						cb(err);												
					});
				else
					cb(err);
				});
		}
	},
	
	sessions: {
		clients: {
			
		},

		getClientsAsList: function() {
			var clients = new Array();
			for(var mac in smartHome.sessions.clients) {
				clients.push({
					ip: smartHome.sessions.clients[mac].ip,
					mac: mac,
					hwClass: smartHome.sessions.clients[mac].hwClass
				});
				
				//delete clients[clients.length-1]['connection'];
			}
			//$.each(smartHome.sessions.clients, function(key, value) { // doesn't work
			//	clients.push(value);
			//});
			return clients;
		},

		login: function(name, password, cb) {
			smartHome.model.User.find({name: name, password: password}, function(err, users) {
				if(err) throw err;
				
				if(users.length > 1) {
					cb('Error - Multiple User with same name');
				} else if(users.length == 0) {
					cb('Error - Invalid User');
				} else {
					var sid = new Date().getTime();
					smartHome.model.Session.create({sid: sid, user: users[0]}, function(err) {
						cb(err, sid);
					});
				}
			});
			
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
			var messageTemplate = smartHome.templates.getMessageByAction(action);
			
			if(messageTemplate != null) {
				var message = JSON.stringify(messageTemplate);
				client.connection.sendUTF(message);
				console.log('>>> ' + message);
			}
				
		},

		send: function(client, message) {
			console.log('>>> ' + JSON.stringify(message));
			client.sendUTF(JSON.stringify(message));
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
		
		getRules: function(mysource, myevent, cb) {
			smartHome.model.Rule.find({ source: mysource, event: myevent}, function(err, foundRules) {
				if(err) throw err;
				cb(foundRules);

			});
			
			return rules;
		},

		getAllRules: function(cb) {
			smartHome.model.Rule.find(function(err, foundRules) {
				cb(foundRules);
			});
		},
		
		processRule: function(rule) {
			if(rule == null)
				console.log('rule invalid');
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