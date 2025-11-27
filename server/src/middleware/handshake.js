'use strict';

const { getService } = require('../utils/getService');

/**
 * Auto assign sockets to appropriate rooms based on tokens associated name.
 * Defaults to default role if no token provided.
 *
 * @param {require('socket.io').Socket} socket The socket attempting to connect
 * @param {Function} next Function to call the next middleware in the stack
 */
async function handshake(socket, next) {
	const strategyService = getService({ name: 'strategy' });
	const auth = socket.handshake.auth || {};
	let strategy = auth.strategy || 'jwt';
	const token = auth.token || '';

	// remove strategy if no token provided
	if (!token.length) {
		strategy = '';
	}

	try {
		let room;
		if (strategy && strategy.length) {
			const strategyType = strategy === 'jwt' ? 'role' : 'token';
			const ctx = await strategyService[strategyType].authenticate(auth);
			room = strategyService[strategyType].getRoomName(ctx);
		} else if (strapi.plugin('users-permissions')) {
			// default to public users-permissions role if no supported auth provided
			const role = await strapi
				.query('plugin::users-permissions.role')
				.findOne({ where: { type: 'public' }, select: ['id', 'name'] });

			room = strategyService['role'].getRoomName(role);
		}

		if (room) {
			socket.join(room.replace(' ', '-'));
		} else {
			throw new Error('No valid room found');
		}

		next();
	} catch (error) {
		next(new Error(error.message));
	}
}

module.exports = {
	handshake,
};
