var async = require('async');
var RocketChat = require('./RocketChat.js');

var instances = [];
var users = [];

for (var i = 0; i < 100; i++) {
	var number = Math.floor((Math.random() * 10000) + 5000);
	users.push({
		name: 'Name Test ' + number,
		email: 'emailtest' + number + '@gmail.com',
		pass: 'any'
	});
}

async.eachSeries(users, (item, callback) => {
	console.log('test ->',item);
	var current = instances.length;
	instances[current] = new RocketChat();
	instances[current].register(item.name, item.email, item.pass)
		.then(() => {
			instances[current].enterRoom('c', 'general');
			return instances[current].sendMessage('GENERAL', 'hello, my name is '+item.name);
		})
		.then(result => {
			console.log('sendMessage ->',result);
			callback(null, result);
		})
		.catch(error => {
			console.log('erro ->',error);
			// callback(error);
			callback(null, error);
		});
});

process.on('SIGINT', () => {
	// console.log('instances ->',instances);
	async.eachSeries(instances, (item, callback) => {
		item.sendMessage('GENERAL', 'disconnecting')
			.then(() => {
				item.asteroid.logout();
				item.asteroid.disconnect();
				setTimeout(() => {
					callback(null, true);
				}, 500);
			})
			.catch(error => {
				console.log('error ->',error);
				callback(null, error);
			})
	});
});
// rocket = new RocketChat();
// rocket.login('diego', 'diego');
// rocket.enterRoom('c', 'general');
