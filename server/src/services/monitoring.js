const EPS_WINDOW_MS = 10_000;

/**
 * Monitoring service: counts emitted events and connections in memory and
 * keeps an optional, bounded event log. It never stores IP addresses, emails,
 * tokens or socket ids.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Monitoring API.
 */
export default ({ strapi }) => {
	let totalEvents = 0;
	let totalConnections = 0;
	let lastEventAt = null;
	let recent = [];
	let log = [];
	let nextId = 1;
	let startedAt = Date.now();

	const settings = () => strapi.plugin('io').service('settings').current();

	const prune = (now) => {
		const cutoff = now - EPS_WINDOW_MS;
		let i = 0;
		while (i < recent.length && recent[i] < cutoff) i += 1;
		if (i) recent = recent.slice(i);
	};

	return {
		/**
		 * Records one emitted event.
		 *
		 * @param {string} event - Event name.
		 * @param {{ audiences?: number, source?: string }} [meta] - Number of rooms reached and origin.
		 */
		recordEvent(event, meta = {}) {
			const now = Date.now();
			totalEvents += 1;
			lastEventAt = now;
			recent.push(now);
			prune(now);
			const { enableEventLogging, maxEventLogSize } = settings().monitoring;
			if (!enableEventLogging) return;
			log.push({
				id: nextId++,
				timestamp: new Date(now).toISOString(),
				event: String(event).slice(0, 100),
				source: meta.source || 'content',
				audiences: Number.isInteger(meta.audiences) ? meta.audiences : null,
			});
			if (log.length > maxEventLogSize) log = log.slice(-maxEventLogSize);
		},

		/** Records one accepted connection. */
		recordConnection() {
			totalConnections += 1;
		},

		/**
		 * Returns event counters.
		 *
		 * @returns {{ totalEvents: number, eventsPerSecond: number, lastEventAt: string | null, totalConnections: number, since: string }} Counters.
		 */
		getEventStats() {
			prune(Date.now());
			return {
				totalEvents,
				eventsPerSecond: Math.round((recent.length / (EPS_WINDOW_MS / 1000)) * 100) / 100,
				lastEventAt: lastEventAt ? new Date(lastEventAt).toISOString() : null,
				totalConnections,
				since: new Date(startedAt).toISOString(),
			};
		},

		/**
		 * Returns connection counts by audience kind (no personal data).
		 *
		 * @returns {Promise<{ connected: number, rooms: number, byKind: Record<string, number> }>} Counts.
		 */
		async getConnectionStats() {
			const io = strapi.$io?.server;
			const byKind = { admin: 0, user: 0, token: 0, public: 0 };
			if (!io) return { connected: 0, rooms: 0, byKind };
			const sockets = await io.fetchSockets();
			for (const socket of sockets) {
				const kind = socket.data?.kind;
				if (kind in byKind) byKind[kind] += 1;
			}
			const roomCount = [...(io.of('/').adapter.rooms?.keys() || [])].filter(
				(room) => !io.of('/').sockets.has(room)
			).length;
			return { connected: sockets.length, rooms: roomCount, byKind };
		},

		/**
		 * Returns the newest log entries.
		 *
		 * @param {number} limit - Maximum entries (clamped to the log size).
		 * @returns {Array<object>} Entries, newest first.
		 */
		getEventLog(limit) {
			const max = settings().monitoring.maxEventLogSize;
			const n = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), max);
			return log.slice(-n).reverse();
		},

		/** Resets counters and the event log. */
		reset() {
			totalEvents = 0;
			totalConnections = 0;
			lastEventAt = null;
			recent = [];
			log = [];
			startedAt = Date.now();
		},
	};
};
