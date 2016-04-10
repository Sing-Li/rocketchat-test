var async = require('async');
var RocketChat = require('./RocketChat.js');

var instances = [];
var users = [];

for (var i = 0; i < 100; i++) {
	var number = Math.floor((Math.random() * 10000) + 3000);
	users.push({
		name: 'Name Test ' + number,
		email: 'emailtest' + number + '@gmail.com',
		pass: 'any'
	});
}

async.eachSeries(users, (item, callback) => {
	console.log('test ->',item);
	var current = new RocketChat();
	current.register(item.name, item.email, item.pass)
		.then(() => {
			current.enterRoom('c', 'general');
			return current.sendMessage('GENERAL', 'hello, my name is '+item.name);
		})
		.then(result => {
			callback(null, result);
		})
		.catch(error => {
			console.log('erro ->',error);
			// callback(error);
			callback(null, error);
		});

	instances.push(current);
});

process.on('SIGINT', () => {
	for (var i = 0; i < instances.length; i++) {
		console.log('disconnecting ->',i);
		instances[i].asteroid.disconnect();
	}
});
// rocket = new RocketChat();
// rocket.login('diego', 'diego');
// rocket.enterRoom('c', 'general');
