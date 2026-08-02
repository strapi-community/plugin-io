'use strict';

const { SocketIO } = require('./SocketIO');
const { resolveSocketServerOptions, SAFE_DEFAULTS } = require('./resolveSocketServerOptions');

module.exports = {
	SocketIO,
	resolveSocketServerOptions,
	SAFE_DEFAULTS,
};
