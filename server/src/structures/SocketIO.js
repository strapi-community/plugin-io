import { Server } from 'socket.io';
import { handshake } from '../middleware/index.js';
import { getService } from '../utils/getService.js';
import { pluginId } from '../utils/pluginId.js';
import { API_TOKEN_TYPE } from '../utils/constants.js';

class SocketIO {
	constructor(options) {
		this._socket = new Server(strapi.server.httpServer, options);
		const { hooks } = strapi.config.get(`plugin::${pluginId}`);
		hooks.init?.({ strapi, $io: this });
		this._socket.use(handshake);
	}

	// eslint-disable-next-line no-unused-vars
	async emit({ event, schema, data: rawData }) {
		const sanitizeService = getService({ name: 'sanitize' });
		const strategyService = getService({ name: 'strategy' });
		const transformService = getService({ name: 'transform' });

		if (!rawData) {
			return;
		}

		const eventName = `${schema.singularName}:${event}`;

		for (const strategyType in strategyService) {
			if (!Object.hasOwnProperty.call(strategyService, strategyType)) continue;

			const strategy = strategyService[strategyType];

			if (typeof strategy.getRooms !== 'function') continue;

			let rooms;
			try {
				rooms = await strategy.getRooms();
			} catch (err) {
				strapi.log.debug(`[socket.io] getRooms failed for ${strategyType}: ${err.message}`);
				continue;
			}

			for (const room of rooms) {
				const permissions = (room.permissions || []).map(({ action }) => ({ action }));
				const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);

				if (room.type === API_TOKEN_TYPE.FULL_ACCESS || ability.can(schema.uid + '.' + event)) {
					try {
						const sanitizedData = await sanitizeService.output({
							data: rawData,
							schema,
							options: {
								auth: {
									name: strategy.name,
									ability,
									strategy: {
										verify: strategy.verify,
									},
									credentials: strategy.credentials?.(room),
								},
							},
						});

						const roomName = strategy.getRoomName(room);
						const data = transformService.response({ data: sanitizedData, schema });
						this._socket.to(roomName.replace(/\s+/g, '-')).emit(eventName, { ...data });
					} catch (err) {
						strapi.log.debug(`[socket.io] emit failed for room ${room.name || room.id}: ${err.message}`);
					}
				}
			}
		}
	}

	/**
	 * Emit a raw event without schema-based sanitization.
	 * Still removes sensitive fields for security.
	 * @param {object} options - Emit options
	 * @param {string} options.event - Event name
	 * @param {any} options.data - Data to emit
	 * @param {string[]} options.rooms - Optional rooms to emit to
	 */
	async raw({ event, data, rooms }) {
		const sanitizeService = getService({ name: 'sanitize' });
		
		let emitter = this._socket;

		if (rooms && rooms.length) {
			rooms.forEach((r) => {
				emitter = emitter.to(r);
			});
		}

		const sanitizedData = sanitizeService.sanitizeRaw(data);
		emitter.emit(event, { data: sanitizedData });
	}

	get server() {
		return this._socket;
	}
}

export { SocketIO };
