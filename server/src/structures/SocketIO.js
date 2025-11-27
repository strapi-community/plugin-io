'use strict';

const { Server } = require('socket.io');
const { handshake } = require('../middleware');
const { getService } = require('../utils/getService');
const { pluginId } = require('../utils/pluginId');
const { API_TOKEN_TYPE } = require('../utils/constants');

class SocketIO {
	constructor(options) {
		this._socket = new Server(strapi.server.httpServer, options);
		const { hooks } = strapi.config.get(`plugin.${pluginId}`);
		hooks.init?.({ strapi, $io: this });
		this._socket.use(handshake);
	}

	// eslint-disable-next-line no-unused-vars
	async emit({ event, schema, data: rawData }) {
		const sanitizeService = getService({ name: 'sanitize' });
		const strategyService = getService({ name: 'strategy' });
		const transformService = getService({ name: 'transform' });

		// account for unsaved single content type being null
		if (!rawData) {
			return;
		}

		const eventName = `${schema.singularName}:${event}`;

		for (const strategyType in strategyService) {
			if (Object.hasOwnProperty.call(strategyService, strategyType)) {
				const strategy = strategyService[strategyType];

				const rooms = await strategy.getRooms();

				for (const room of rooms) {
					const permissions = room.permissions.map(({ action }) => ({ action }));
					const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);

					if (room.type === API_TOKEN_TYPE.FULL_ACCESS || ability.can(schema.uid + '.' + event)) {
						// sanitize
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

						// transform
						const data = transformService.response({ data: sanitizedData, schema });
						// emit
						this._socket.to(roomName.replace(' ', '-')).emit(eventName, { ...data });
					}
				}
			}
		}
	}

	async raw({ event, data, rooms }) {
		let emitter = this._socket;

		// send to all specified rooms
		if (rooms && rooms.length) {
			rooms.forEach((r) => {
				emitter = emitter.to(r);
			});
		}

		emitter.emit(event, { data });
	}

	get server() {
		return this._socket;
	}
}

module.exports = {
	SocketIO,
};
