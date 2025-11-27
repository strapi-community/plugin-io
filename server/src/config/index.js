'use strict';

const { plugin } = require('./schema');

module.exports = {
	default() {
		return {
			events: [],
			hooks: {},
			contentTypes: [],
			socket: { serverOptions: { cors: { origin: 'http://127.0.0.1:8080', methods: ['GET', 'POST'] } } },
		};
	},
	validator(config) {
		plugin.parse(config);
	},
};
