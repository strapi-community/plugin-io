import { getService } from '../utils/getService.js';

/**
 * Auto assign sockets to appropriate rooms based on tokens associated name.
 * Defaults to default role if no token provided.
 *
 * @param {import('socket.io').Socket} socket The socket attempting to connect
 * @param {Function} next Function to call the next middleware in the stack
 */
async function handshake(socket, next) {
	const strategyService = getService({ name: 'strategy' });
	const auth = socket.handshake.auth || {};
	let strategy = auth.strategy || 'jwt';
	const token = auth.token || '';

	if (!token.length) {
		strategy = '';
	}

	try {
		let room;
		if (strategy && strategy.length) {
			let strategyType;
			if (strategy === 'jwt') {
				strategyType = 'role';
			} else if (strategy === 'admin-jwt') {
				strategyType = 'admin';
			} else {
				strategyType = 'token';
			}

			const ctx = await strategyService[strategyType].authenticate(auth);
			room = strategyService[strategyType].getRoomName(ctx);

			if (strategyType === 'admin') {
				socket.data.user = ctx;
			} else if (strategyType === 'role' && ctx) {
				socket.data.user = { role: ctx };
			}
		} else if (strapi.plugin('users-permissions')) {
			const role = await strapi.documents('plugin::users-permissions.role').findFirst({
				filters: { type: 'public' },
				fields: ['id', 'name'],
			});

			room = strategyService['role'].getRoomName(role);
		}

		if (room) {
			socket.join(room.replace(/\s+/g, '-'));
		} else {
			throw new Error('No valid room found');
		}

		next();
	} catch (error) {
		next(new Error(error.message));
	}
}

export { handshake };
