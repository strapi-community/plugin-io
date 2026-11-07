const EPS_WINDOW_MS = 10_000;

/**
 * Monitoring service: counts emitted events and connections in memory and
 * keeps an optional, bounded event log. It never stores IP addresses, emails,
 * tokens or socket ids.
 *
 * Every process counts its own traffic. `getClusterStats()` adds up the
 * snapshots of all live processes (this one fresh, the others from their
 * last heartbeat, at most one heartbeat interval old).
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
		 * Returns this process's connection counts by audience kind (no
		 * personal data). Synchronous: reads the local sockets only.
		 *
		 * @returns {{ connected: number, rooms: number, byKind: Record<string, number> }} Counts.
		 */
		getLocalConnectionStats() {
			const io = strapi.$io?.server;
			const byKind = { admin: 0, user: 0, token: 0, public: 0 };
			if (!io) return { connected: 0, rooms: 0, byKind };
			const nsp = io.of('/');
			for (const socket of nsp.sockets.values()) {
				const kind = socket.data?.kind;
				if (kind in byKind) byKind[kind] += 1;
			}
			const roomCount = [...(nsp.adapter.rooms?.keys() || [])].filter((room) => !nsp.sockets.has(room)).length;
			return { connected: nsp.sockets.size, rooms: roomCount, byKind };
		},

		/**
		 * Returns connection counts (alias of the cluster-wide numbers).
		 *
		 * @returns {Promise<{ connected: number, rooms: number, byKind: Record<string, number> }>} Counts.
		 */
		async getConnectionStats() {
			return (await this.getClusterStats()).connections;
		},

		/**
		 * Counters of this process for the cluster heartbeat.
		 *
		 * @returns {{ connections: number, rooms: number, byKind: Record<string, number>, events: object }} Snapshot.
		 */
		localSnapshot() {
			const { connected, rooms, byKind } = this.getLocalConnectionStats();
			return { connections: connected, rooms, byKind, events: this.getEventStats() };
		},

		/**
		 * Adds up the counters of every live process.
		 *
		 * @returns {Promise<{ connections: { connected: number, rooms: number, byKind: Record<string, number> }, events: object, instances: { count: number, mode: string, adapter: string, clusterAdapter: boolean, warnings: string[] } }>} Totals.
		 */
		async getClusterStats() {
			const cluster = strapi.plugin('io').service('cluster');
			const instances = await cluster.instances();
			const byKind = { admin: 0, user: 0, token: 0, public: 0 };
			const totals = { connected: 0, rooms: 0 };
			const events = { totalEvents: 0, eventsPerSecond: 0, lastEventAt: null, totalConnections: 0, since: null };
			for (const { stats } of instances) {
				totals.connected += Number(stats?.connections) || 0;
				totals.rooms += Number(stats?.rooms) || 0;
				for (const kind of Object.keys(byKind)) byKind[kind] += Number(stats?.byKind?.[kind]) || 0;
				const e = stats?.events ?? {};
				events.totalEvents += Number(e.totalEvents) || 0;
				events.totalConnections += Number(e.totalConnections) || 0;
				events.eventsPerSecond += Number(e.eventsPerSecond) || 0;
				if (e.lastEventAt && (!events.lastEventAt || e.lastEventAt > events.lastEventAt))
					events.lastEventAt = e.lastEventAt;
				if (e.since && (!events.since || e.since < events.since)) events.since = e.since;
			}
			events.eventsPerSecond = Math.round(events.eventsPerSecond * 100) / 100;
			const status = cluster.status();
			return {
				connections: { ...totals, byKind },
				events,
				instances: { ...status, count: instances.length },
			};
		},

		/**
		 * Returns the newest log entries of this process.
		 *
		 * @param {number} limit - Maximum entries (clamped to the log size).
		 * @returns {Array<object>} Entries, newest first.
		 */
		getEventLog(limit) {
			return this.getLocalEventLog(limit);
		},

		/**
		 * Returns the newest log entries of this process (same as `getEventLog`).
		 *
		 * @param {number} limit - Maximum entries (clamped to the log size).
		 * @returns {Array<object>} Entries, newest first.
		 */
		getLocalEventLog(limit) {
			const max = settings().monitoring.maxEventLogSize;
			const n = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), max);
			return log.slice(-n).reverse();
		},

		/**
		 * Returns the newest log entries of every process that answers within
		 * 2.5 s (needs a multi-server adapter), merged by time.
		 *
		 * @param {number} limit - Maximum entries.
		 * @returns {Promise<{ entries: Array<object>, scope: 'all' | 'instance' }>} Entries, newest first, and whether other processes are included.
		 */
		async collectEventLog(limit) {
			const cluster = strapi.plugin('io').service('cluster');
			const own = this.getLocalEventLog(limit);
			const status = cluster.status();
			if (!status.clusterAdapter) return { entries: own, scope: status.instances > 1 ? 'instance' : 'all' };
			const max = settings().monitoring.maxEventLogSize;
			const n = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), max);
			const responses = await cluster.askPeers(cluster.EVENT_LOG_REQUEST, n);
			const merged = [own, ...responses]
				.filter(Array.isArray)
				.flat()
				.filter((entry) => entry && typeof entry.timestamp === 'string')
				.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
				.slice(0, n)
				.map((entry, index) => ({ ...entry, id: index + 1 }));
			return { entries: merged, scope: 'all' };
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
