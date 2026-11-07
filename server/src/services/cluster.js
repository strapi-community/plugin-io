import { randomUUID } from 'node:crypto';
import { createDatabaseStore, createMemoryStore } from '../cluster/store.js';
import { createNodeId, detectClusterEnv, isClusterAdapter } from '../cluster/env.js';

/** Server-side event of the control channel (`io.serverSideEmit`). */
const CONTROL_EVENT = 'io:control';
/** Server-side request for another process's event log. */
const EVENT_LOG_REQUEST = 'io:event-log';

const DEFAULTS = Object.freeze({ pollInterval: 3000, heartbeatInterval: 10_000 });
const SIGNAL_TTL_MS = 5 * 60 * 1000;
const SEEN_MAX = 1000;
const PEER_REQUEST_TIMEOUT_MS = 2500;

/**
 * Cluster service: lets several Strapi processes (pm2 cluster workers,
 * Railway replicas) that share one database act as one Socket.IO server.
 *
 * - Decides the mode at boot. With `config.cluster.enabled: 'auto'` (default)
 *   coordination turns on when a multi-server Socket.IO adapter is attached
 *   or the process is a pm2 cluster worker or a Railway replica. One plain
 *   process keeps the in-memory behaviour and writes nothing.
 * - Holds the shared store (presence tokens, failed-handshake counters,
 *   node heartbeats, control signals) in plugin tables.
 * - Runs one control channel: a signal goes to the other processes through
 *   `io.serverSideEmit` (immediate, needs an adapter) and through the signal
 *   table, which every process polls (fallback without an adapter, and when
 *   the adapter's pub/sub is down). Receivers drop duplicates by signal id.
 * - Writes a heartbeat with this process's counters, used for the
 *   cluster-wide connection cap and aggregated monitoring, and to warn when
 *   several processes run without an adapter.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Cluster API.
 */
export default ({ strapi }) => {
	const memory = createMemoryStore();
	const nodeId = createNodeId();
	const startedAt = Date.now();
	/** @type {Map<string, (payload: any) => any>} */
	const handlers = new Map();
	const seen = new Set();

	let store = memory;
	let coordinated = false;
	let clusterAdapter = false;
	let adapterName = 'memory';
	let server = null;
	let env = detectClusterEnv();
	let peers = [];
	let peersReadAt = 0;
	let peersReading = null;
	let lastSignalId = 0;
	let timers = [];
	let ticks = 0;
	let warnedPeers = false;
	let lastErrorAt = 0;
	const warnings = new Set();
	let controlListener = null;
	let logListener = null;

	const options = () => ({ ...DEFAULTS, ...(strapi.config.get('plugin::io.cluster', {}) ?? {}) });
	const plugin = () => strapi.plugin('io');

	const reportError = (operation, error) => {
		const now = Date.now();
		if (now - lastErrorAt < 60_000) return;
		lastErrorAt = now;
		strapi.log.warn(`[io] Cluster ${operation} failed: ${error?.message ?? 'error'}`);
	};

	/** Records a signal id; false when it was handled before. */
	const remember = (uid) => {
		if (seen.has(uid)) return false;
		seen.add(uid);
		if (seen.size > SEEN_MAX) seen.delete(seen.values().next().value);
		return true;
	};

	const dispatch = async (signal) => {
		if (!signal || typeof signal !== 'object' || typeof signal.uid !== 'string') return;
		if (signal.origin === nodeId || !remember(signal.uid)) return;
		const handler = handlers.get(signal.kind);
		if (!handler) return;
		try {
			await handler(signal.payload ?? null);
		} catch (error) {
			strapi.log.warn(`[io] Handling cluster signal "${signal.kind}" failed: ${error?.message ?? 'error'}`);
		}
	};

	const heartbeat = async () => {
		const now = Date.now();
		const { heartbeatInterval } = options();
		await store.beat(nodeId, plugin().service('monitoring').localSnapshot(), now, startedAt);
		const alive = await store.listNodes(now - heartbeatInterval * 3);
		peers = alive.filter((node) => node.nodeId !== nodeId);
		peersReadAt = Date.now();
		if (peers.length && !clusterAdapter && !warnedPeers) {
			warnedPeers = true;
			warnings.add('no-adapter');
			strapi.log.warn(
				`[io] ${peers.length + 1} Strapi processes share this database, but Socket.IO has no multi-server adapter. ` +
					'Events reach only the clients connected to the process that sent them. Set config.socket.adapter ' +
					'("postgres" or "redis"); see README "Running several instances".'
			);
		}
		if (ticks % 6 === 0) await store.pruneNodes(now - heartbeatInterval * 30);
	};

	const poll = async () => {
		ticks += 1;
		const signals = await store.signalsAfter(lastSignalId);
		for (const signal of signals) {
			lastSignalId = Math.max(lastSignalId, signal.id);
			await dispatch(signal);
		}
		// Safety net when a signal was lost: compare the settings revision.
		if (ticks % 10 === 0) {
			await plugin().service('settings').refresh();
			const now = Date.now();
			await store.pruneSignals(now - SIGNAL_TTL_MS);
			await store.pruneCounters?.(now);
		}
	};

	const every = (ms, fn, name) => {
		const timer = setInterval(() => {
			fn().catch((error) => reportError(name, error));
		}, ms);
		timer.unref?.();
		timers.push(timer);
	};

	return {
		CONTROL_EVENT,
		EVENT_LOG_REQUEST,
		nodeId,

		/** @returns {object} Active store (memory until `start()` turns on coordination). */
		store() {
			return store;
		},

		/** @returns {boolean} True when shared state lives in the database. */
		isCoordinated() {
			return coordinated;
		},

		/** @returns {boolean} True when the Socket.IO adapter spans several servers. */
		hasClusterAdapter() {
			return clusterAdapter;
		},

		/**
		 * Picks the mode, creates the tables and starts the heartbeat and the
		 * signal poll. Logs a warning for setups that cannot work across
		 * processes (no adapter, long-polling without sticky sessions, Railway
		 * without proxy trust).
		 *
		 * @param {{ io: import('socket.io').Server, adapterType?: string | null }} deps - Socket.IO server and configured adapter type.
		 * @returns {Promise<void>}
		 */
		async start({ io, adapterType = null }) {
			server = io;
			env = detectClusterEnv();
			const adapter = io.of('/').adapter;
			clusterAdapter = isClusterAdapter(adapter);
			adapterName = adapterType ?? (clusterAdapter ? adapter.constructor.name : 'memory');
			const { enabled = 'auto', pollInterval, heartbeatInterval } = options();
			coordinated = enabled === true || (enabled === 'auto' && (env.clustered || clusterAdapter));

			if (coordinated) {
				const knex = strapi.db?.connection;
				try {
					if (!knex) throw new Error('no database connection');
					const db = createDatabaseStore({
						knex,
						dialect: strapi.db?.dialect?.client ?? strapi.config.get('database.connection.client'),
					});
					await db.ensure();
					lastSignalId = await db.lastSignalId();
					store = db;
				} catch (error) {
					coordinated = false;
					strapi.log.error(
						`[io] Could not set up the shared tables (${error?.message ?? 'error'}). Each process keeps its own state.`
					);
				}
			}

			if (clusterAdapter) {
				controlListener = (signal) => {
					dispatch(signal);
				};
				logListener = (limit, ack) => {
					if (typeof ack === 'function') ack(plugin().service('monitoring').getLocalEventLog(limit));
				};
				io.of('/').on(CONTROL_EVENT, controlListener);
				io.of('/').on(EVENT_LOG_REQUEST, logListener);
			}

			if (env.worker && !clusterAdapter) {
				warnings.add('no-adapter');
				warnedPeers = true;
				strapi.log.warn(
					`[io] This process is a pm2 cluster or node:cluster worker, but Socket.IO has no multi-server adapter. ` +
						'Events, presence and typing indicators reach only clients on the same process. Set config.socket.adapter ' +
						'("postgres" or "redis"); see README "Running several instances".'
				);
			}
			const transports = io.engine?.opts?.transports ?? [];
			if ((env.worker || clusterAdapter) && transports.includes('polling')) {
				warnings.add('polling');
				strapi.log.warn(
					'[io] HTTP long-polling is enabled with several processes. Without sticky sessions its requests land on ' +
						'other processes and fail with "Session ID unknown". Set config.socket.websocketOnly: true and connect ' +
						"clients with transports: ['websocket']."
				);
			}
			if (env.railway && !strapi.server?.app?.proxy) {
				warnings.add('proxy');
				strapi.log.warn(
					'[io] Running on Railway without server.proxy.koa: every client appears with the proxy IP, so IP rules and ' +
						"the failed-handshake lockout hit all clients at once. Set server.proxy = { koa: true, ipHeader: 'X-Real-IP', maxIpsCount: 1 }."
				);
			}

			if (coordinated) {
				await heartbeat().catch((error) => reportError('heartbeat', error));
				every(heartbeatInterval, heartbeat, 'heartbeat');
				every(pollInterval, poll, 'signal poll');
				strapi.log.info(
					`[io] Multi-instance mode: shared state in the database, Socket.IO adapter: ${adapterName}, ` +
						`${peers.length + 1} instance(s) seen.`
				);
			}
		},

		/**
		 * Stops the timers and removes this process from the node table.
		 *
		 * @returns {Promise<void>}
		 */
		async stop() {
			for (const timer of timers) clearInterval(timer);
			timers = [];
			if (server && controlListener) server.of('/').off(CONTROL_EVENT, controlListener);
			if (server && logListener) server.of('/').off(EVENT_LOG_REQUEST, logListener);
			controlListener = null;
			logListener = null;
			if (coordinated) await store.removeNode(nodeId).catch(() => {});
			await memory.clearTokens();
		},

		/**
		 * Registers the handler for one signal kind (`revalidate`, `audiences`,
		 * `settings`, `stats-reset`). Handlers run only for signals from other
		 * processes; the sender applies the change itself.
		 *
		 * @param {string} kind - Signal kind.
		 * @param {(payload: any) => any} handler - Handler.
		 */
		on(kind, handler) {
			handlers.set(kind, handler);
		},

		/**
		 * Sends a signal to the other processes. Does nothing for one process.
		 *
		 * @param {string} kind - Signal kind.
		 * @param {any} [payload] - JSON payload.
		 * @returns {Promise<void>}
		 */
		async publish(kind, payload = null) {
			if (!coordinated && !clusterAdapter) return;
			const signal = { uid: randomUUID(), kind, origin: nodeId, payload };
			remember(signal.uid);
			if (clusterAdapter) {
				try {
					server.of('/').serverSideEmit(CONTROL_EVENT, signal);
				} catch (error) {
					reportError('serverSideEmit', error);
				}
			}
			if (coordinated) await store.pushSignal(signal).catch((error) => reportError('signal write', error));
		},

		/** Runs one poll right away (tests and graceful handover). */
		async pollNow() {
			if (coordinated) await poll();
		},

		/** Writes a heartbeat right away (tests). */
		async heartbeatNow() {
			if (coordinated) await heartbeat();
		},

		/**
		 * Connections on the other processes, from their last heartbeat.
		 *
		 * @returns {number} Connections elsewhere.
		 */
		connectionsElsewhere() {
			return peers.reduce((sum, node) => sum + (Number(node.stats?.connections) || 0), 0);
		},

		/**
		 * Connections on the other processes, re-reading the node table when the
		 * last read is older than the poll interval. Without this a process
		 * would see the others' counts only at its own next heartbeat, so the
		 * figures could be up to two heartbeat intervals old. Concurrent callers
		 * share one read; a failed read keeps the last known figures.
		 *
		 * @returns {Promise<number>} Connections elsewhere.
		 */
		async connectionsElsewhereFresh() {
			if (!coordinated) return 0;
			if (Date.now() - peersReadAt > options().pollInterval) {
				peersReading ??= store
					.listNodes(Date.now() - options().heartbeatInterval * 3)
					.then((alive) => {
						peers = alive.filter((node) => node.nodeId !== nodeId);
						peersReadAt = Date.now();
					})
					.catch((error) => reportError('node list', error))
					.finally(() => {
						peersReading = null;
					});
				await peersReading;
			}
			return this.connectionsElsewhere();
		},

		/**
		 * Snapshots of every live process (this one fresh, the others from their
		 * last heartbeat).
		 *
		 * @returns {Promise<Array<{ nodeId: string, self: boolean, stats: object }>>} Instances.
		 */
		async instances() {
			const self = { nodeId, self: true, stats: plugin().service('monitoring').localSnapshot() };
			if (!coordinated) return [self];
			try {
				const alive = await store.listNodes(Date.now() - options().heartbeatInterval * 3);
				peers = alive.filter((node) => node.nodeId !== nodeId);
				peersReadAt = Date.now();
			} catch (error) {
				reportError('node list', error);
			}
			return [self, ...peers.map((node) => ({ nodeId: node.nodeId, self: false, stats: node.stats }))];
		},

		/**
		 * Asks every other Socket.IO server for its answer to a server-side
		 * request. Returns what arrived within 2.5 s; empty without an adapter.
		 *
		 * @param {string} event - Server-side event.
		 * @param {...any} args - Arguments.
		 * @returns {Promise<any[]>} Responses.
		 */
		async askPeers(event, ...args) {
			if (!clusterAdapter || !server) return [];
			let timer;
			try {
				return await Promise.race([
					server.of('/').serverSideEmitWithAck(event, ...args),
					new Promise((resolve) => {
						timer = setTimeout(() => resolve([]), PEER_REQUEST_TIMEOUT_MS);
						timer.unref?.();
					}),
				]);
			} catch (error) {
				return Array.isArray(error?.responses) ? error.responses : [];
			} finally {
				clearTimeout(timer);
			}
		},

		/**
		 * Mode summary for the admin (no ids, hosts or addresses).
		 *
		 * @returns {{ mode: 'single' | 'database', adapter: string, clusterAdapter: boolean, instances: number, warnings: string[] }} Status.
		 */
		status() {
			return {
				mode: coordinated ? 'database' : 'single',
				adapter: adapterName,
				clusterAdapter,
				instances: coordinated ? peers.length + 1 : 1,
				warnings: [...warnings],
			};
		},
	};
};

export { CONTROL_EVENT, EVENT_LOG_REQUEST };
