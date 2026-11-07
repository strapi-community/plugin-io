import cluster from 'node:cluster';
import { createHash, randomBytes } from 'node:crypto';
import { hostname } from 'node:os';

/**
 * Reads the signs that this process is one of several:
 * - pm2 cluster mode runs every instance as a `node:cluster` worker
 *   (`cluster.isWorker`). `NODE_APP_INSTANCE` is not used: pm2 documents it
 *   as a per-process number without saying it is cluster-only
 *   (https://pm2.keymetrics.io/docs/usage/environment/);
 * - Railway sets `RAILWAY_REPLICA_ID` on every replica
 *   (https://docs.railway.com/variables/reference#railway-provided-variables).
 *   It is set with one replica too, so the other processes are found through
 *   the node heartbeat table instead.
 *
 * @param {NodeJS.ProcessEnv} [env] - Environment.
 * @param {{ isWorker?: boolean }} [nodeCluster] - `node:cluster`.
 * @returns {{ clustered: boolean, worker: boolean, railway: boolean, reasons: string[] }} Detection result:
 *   `clustered` turns on coordination, `worker` means peers certainly exist.
 */
function detectClusterEnv(env = process.env, nodeCluster = cluster) {
	const reasons = [];
	const worker = Boolean(nodeCluster?.isWorker);
	if (worker) reasons.push('node:cluster worker (pm2 cluster mode)');
	const railway = Boolean(env.RAILWAY_REPLICA_ID || env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_SERVICE_ID);
	if (env.RAILWAY_REPLICA_ID) reasons.push('Railway replica');
	return { clustered: reasons.length > 0, worker, railway, reasons };
}

/**
 * A process identifier for the node table: host hash (never the host name),
 * Railway replica prefix, pid and a random suffix.
 *
 * @param {NodeJS.ProcessEnv} [env] - Environment.
 * @returns {string} Node id.
 */
function createNodeId(env = process.env) {
	let host = 'unknown';
	try {
		host = hostname() || 'unknown';
	} catch {}
	const hostHash = createHash('sha256').update(host).digest('hex').slice(0, 10);
	const replica = env.RAILWAY_REPLICA_ID ? `${String(env.RAILWAY_REPLICA_ID).slice(0, 8)}-` : '';
	return `${replica}${hostHash}:${process.pid}:${randomBytes(3).toString('hex')}`;
}

/**
 * Whether a Socket.IO adapter spans several servers. The default in-memory
 * `Adapter` and `SessionAwareAdapter` do not; their `serverSideEmit` only logs
 * a warning (socket.io-adapter 2.5 `in-memory-adapter.js`).
 *
 * @param {any} adapter - Namespace adapter.
 * @returns {boolean} True for Redis, Postgres, cluster and similar adapters.
 */
function isClusterAdapter(adapter) {
	const name = adapter?.constructor?.name;
	return Boolean(adapter) && name !== 'Adapter' && name !== 'SessionAwareAdapter';
}

export { createNodeId, detectClusterEnv, isClusterAdapter };
