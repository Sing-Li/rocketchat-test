'use strict';

const Promise = require('promise');
const WebSocket = require('faye-websocket').Client;
const createClass = require("asteroid").createClass;

class RocketChat {
	constructor() {
		const Asteroid = createClass();
		// Connect to a Meteor backend
		this.asteroid = new Asteroid({
			endpoint: "ws://localhost:3000/websocket",
			SocketConstructor: WebSocket
		});

		this.asteroid.on('connected', () => {
			console.log('connected ->',arguments);
		});

		this.asteroid.on('loggedIn', () => {
			console.log('loggedIn ->',arguments);
		});

		this.userId = null;
		this.openedRoom = null;

		this.roomsMap = {};

		this.streams = {
			'stream-notify-all': 1,
			'stream-notify-room': 1,
			'stream-notify-user': 1,
			'stream-messages': 1,
		};

		this.controlDDP();
	}

	controlDDP() {
		this.asteroid.ddp.on("added", (msg) => {
			if (msg.fields && msg.fields.type && msg.fields.type === 'subscriptionId') {
				if (this.streams[msg.collection]) {
					this.streams[msg.collection] = msg.id;
				} else {
					console.log('subscription not found');
				}
			}

			if (msg.collection === 'rocketchat_room' && this.openedRoom === null) {
				this.openedRoom = msg.id;
				this.roomsMap[msg.fields.t + msg.fields.name] = msg.id;
				this.clearRoomStreams(msg.id);
			}

			// if (msg.collection === 'stream-messages') {
			// 	console.log('message ->',msg.fields);
			// }
			var collection = msg.collection;
			var id = msg.id;
			var fields = msg.fields;
			// console.log(`Element added to collection ${collection}`);
			// console.log(id);
			// console.log(fields);
		});

		this.asteroid.ddp.on("changed", (test) => {
			var collection = test.collection;
			var id = test.id;
			var fields = test.fields;
			// console.log(`Element changed to collection ${collection}`);
			// console.log(id);
			// console.log(fields);
		});
	}

	defaultSubscribes() {
		this.asteroid.subscribe('settings');
		this.asteroid.subscribe('stream-notify-all');
		this.asteroid.subscribe('stream-notify-room');
		this.asteroid.subscribe('stream-notify-user');
		this.asteroid.subscribe('scopedRoles', 'Users');
		this.asteroid.subscribe('scopedRoles', 'Subscriptions');
		this.asteroid.subscribe('roles');
		this.asteroid.subscribe('permissions');
		this.asteroid.subscribe('integrations');
		this.asteroid.subscribe('oauthApps');
		this.asteroid.subscribe('subscription');
		this.asteroid.subscribe('userData');
		this.asteroid.subscribe('activeUsers');
		this.asteroid.subscribe('meteor_autoupdate_clientVersions');
		this.asteroid.subscribe('stream-messages', null);
	}

	clearUserStreams() {
		this.asteroid.call('stream-notify-user', this.streams['stream-notify-user'], [ 'clear', `${this.userId}/message` ]);
		this.asteroid.call('stream-notify-user', this.streams['stream-notify-user'], [ 'clear', `${this.userId}/otr` ]);
		this.asteroid.call('stream-notify-user', this.streams['stream-notify-user'], [ 'clear', `${this.userId}/webrtc` ]);
		this.asteroid.call('stream-notify-user', this.streams['stream-notify-user'], [ 'clear', `${this.userId}/notification` ]);
	}

	clearRoomStreams(roomId) {
		this.asteroid.call('stream-messages', this.streams['stream-messages'], [ 'clear', `${roomId}/message` ]);
		this.asteroid.call('stream-notify-room', this.streams['stream-notify-room'], [ 'clear', `${roomId}/deleteMessage` ]);
		this.asteroid.call('stream-notify-room', this.streams['stream-notify-room'], [ 'clear', `${roomId}/typing` ]);
	}

	login(username, pass) {
		this.asteroid.loginWithPassword({ username: username, password: pass })
			.then(userId => {
				this.userId = userId;
				this.defaultSubscribes();

				// @TODO esperar receber todos os streams e remover o timeout
				setTimeout(() => {
					this.clearUserStreams();
				}, 500);
			})
			.catch(error => {
				console.log("Error");
				console.error(error);
			});
	}

	register(name, email, pass) {
		return new Promise((fulfill, reject) => {
			this.asteroid.call("registerUser", { email: email, pass: pass, name: name })
				.then(result => {
					console.log("registerUser ->", result);

					return this.asteroid.loginWithPassword({ email: email, password: pass });
				})
				.then(userId => {
					console.log('loginWithPassword ->',userId);
					this.userId = userId;
					this.defaultSubscribes();
					this.clearUserStreams();

					// @TODO esperar receber todos os streams e remover o timeout
					setTimeout(() => {
						this.clearUserStreams();
					}, 500);

					return this.asteroid.call('getUsernameSuggestion');
				})
				.then(result => {
					console.log('getUsernameSuggestion ->', result);
					this.asteroid.call('setUsername', result);
					return this.asteroid.call('joinDefaultChannels');
				})
				.then(result => {
					console.log('joinDefaultChannels ->',result);
					fulfill(result);
				})
				.catch(error => {
					console.log("Error");
					console.error(error);
					reject(error);
				});
		});


		// this.asteroid.call('getUsernameSuggestion')
			// .catch(error => {
			// 	console.log("Error");
			// 	console.error(error);
			// });
	}

	enterRoom(type, name) {
		if (this.roomsMap[type + name]) {
			this.openedRoom = this.roomsMap[type + name];
		} else {
			this.openedRoom = null;
			this.asteroid.subscribe('room', type + name);
		}
	}

	sendMessage(roomId, message) {
		return this.asteroid.call('sendMessage', { msg: message, rid: roomId });
			// .then(result => {
			// 	console.log("Success");
			// 	console.log(result);
			// })
			// .catch(error => {
			// 	console.log("Error");
			// 	console.error(error);
			// });
	}
}

module.exports = RocketChat;
