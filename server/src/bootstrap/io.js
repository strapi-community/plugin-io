import { SocketIO } from '../structures/SocketIO.js';
import { createTokenBucket } from '../services/rate-limit.js';
import { pluginId } from '../utils/pluginId.js';
import { registerPresence } from './presence.js';

/**
 * Creates `strapi.$io`, runs `hooks.init`, and registers the connection
 * handlers: rate limiting, credential expiry, presence and the custom events
 * from `config.events`.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {Promise<SocketIO>} The instance.
 */
async function bootstrapIO({ strapi }) {
	const config = strapi.config.get(`plugin::${pluginId}`);
	const settingsService = strapi.plugin(pluginId).service('settings');
	const monitoring = strapi.plugin(pluginId).service('monitoring');

	const io = new SocketIO(config.socket?.serverOptions, { strapi });
	strapi.$io = io;

	const lastSeen = new Map();

	io.server.on('connection', (socket) => {
		monitoring.recordConnection();
		const settings = settingsService.current();
		if (settings.monitoring.enableConnectionLogging) {
			strapi.log.info(`[io] Client connected (${socket.data.kind || 'public'})`);
			socket.once('disconnect', (reason) => strapi.log.info(`[io] Client disconnected (${reason})`));
		}

		io.trackExpiry(socket);

		const allow = createTokenBucket(() => settingsService.current().security.rateLimiting.maxEventsPerSecond);
		socket.use((_packet, next) => {
			if (!settingsService.current().security.rateLimiting.enabled || allow()) return next();
			return next(new Error('Rate limit exceeded'));
		});
		socket.on('error', (error) => {
			if (error?.message === 'Rate limit exceeded') socket.emit('io:error', { message: error.message });
		});

		registerPresence({ strapi, io: io.server, socket, lastSeen });

		for (const event of config.events || []) {
			const run = async (...args) => {
				try {
					await event.handler({ strapi, io }, socket, ...args);
				} catch (error) {
					strapi.log.error(`[io] Handler for "${event.name}" failed: ${error?.message}`);
				}
			};
			if (event.name === 'connection') run();
			else socket.on(event.name, run);
		}
	});

	try {
		await config.hooks?.init?.({ strapi, $io: io });
	} catch (error) {
		strapi.log.error(`[io] hooks.init failed: ${error?.message}`);
	}

	return io;
}

export { bootstrapIO };
