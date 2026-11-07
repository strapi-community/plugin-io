import { errors } from '@strapi/utils';
import { RESERVED_EVENT_NAMES } from '../utils/constants.js';

const { ValidationError } = errors;

const EVENT_NAME_RE = /^[a-zA-Z0-9:._-]{1,99}$/;
const MAX_TEST_BYTES = 8 * 1024;
const MAX_DEPTH = 10;
const MAX_KEYS = 200;

/**
 * Checks payload depth and key count.
 *
 * @param {any} value - Parsed JSON.
 * @returns {boolean} True when within limits.
 */
function withinLimits(value) {
	let keys = 0;
	const walk = (node, depth) => {
		if (depth > MAX_DEPTH) return false;
		if (node && typeof node === 'object') {
			const entries = Object.entries(node);
			keys += entries.length;
			if (keys > MAX_KEYS) return false;
			return entries.every(([, child]) => walk(child, depth + 1));
		}
		return true;
	};
	return walk(value, 0);
}

/**
 * Validates a test event name: allowed characters, not reserved, and not a
 * name the plugin uses for content or presence events.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi - Strapi instance.
 * @param {unknown} name - Event name.
 * @returns {string | null} Error message, or null when valid.
 */
function validateTestEventName(strapi, name) {
	if (typeof name !== 'string' || !EVENT_NAME_RE.test(name)) {
		return 'Use 1 to 99 letters, numbers, ":", ".", "_" or "-".';
	}
	if (RESERVED_EVENT_NAMES.includes(name)) return 'This event name is reserved by Socket.IO.';
	const prefix = name.split(':')[0];
	const contentNames = Object.values(strapi.contentTypes).map((ct) => ct.info?.singularName);
	if (name.includes(':') && (['presence', 'io'].includes(prefix) || contentNames.includes(prefix))) {
		return 'This name is used for content or presence events. Choose another name.';
	}
	return null;
}

/**
 * Admin controller for monitoring. Responses contain counts only, never IP
 * addresses, emails, tokens or socket ids.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Handlers.
 */
export default ({ strapi }) => {
	const monitoring = () => strapi.plugin('io').service('monitoring');

	return {
		/**
		 * @route GET /io/stats
		 * @access admin with `plugin::io.monitoring.read`
		 * @returns {{ data: { connections: object, events: object, instances: object } }} Counters summed over every live process, and how many there are.
		 */
		async getStats(ctx) {
			ctx.body = { data: await monitoring().getClusterStats() };
		},

		/**
		 * @route GET /io/event-log
		 * @access admin with `plugin::io.monitoring.read`
		 * @param {string} [ctx.query.limit] - 1 to the configured log size (default 50).
		 * @returns {{ data: Array<object>, meta: { enabled: boolean, scope: 'all' | 'instance' } }} Newest entries first; `scope: 'instance'` when other processes could not be asked (no multi-server adapter).
		 */
		async getEventLog(ctx) {
			const enabled = strapi.plugin('io').service('settings').current().monitoring.enableEventLogging;
			const { entries, scope } = await monitoring().collectEventLog(ctx.query?.limit);
			ctx.body = { data: entries, meta: { enabled, scope } };
		},

		/**
		 * Lists the admins with an open presence connection. Documents in content
		 * types the requesting admin cannot read in the Content Manager are not
		 * listed; `hiddenEditing` counts them instead.
		 *
		 * @route GET /io/online-users
		 * @access admin with `plugin::io.monitoring.read`
		 * @returns {{ data: { admins: Array<object>, counts: object }, meta: { scope: 'all' | 'instance' } }} Admins online and counts by kind (all processes with a multi-server adapter).
		 */
		async getOnlineUsers(ctx) {
			const io = strapi.$io?.server;
			const counts = { total: 0, admin: 0, user: 0, token: 0, public: 0 };
			const admins = new Map();
			const ability = ctx.state?.userAbility;
			const readable = new Map();
			const canRead = (uid) => {
				if (!readable.has(uid)) {
					readable.set(uid, Boolean(ability?.can?.('plugin::content-manager.explorer.read', uid)));
				}
				return readable.get(uid);
			};
			if (io) {
				const now = Date.now();
				for (const socket of await io.fetchSockets()) {
					counts.total += 1;
					const kind = socket.data?.kind;
					if (kind in counts) counts[kind] += 1;
					if (kind !== 'admin' || !socket.data.admin?.id) continue;
					const user = socket.data.admin;
					const connectedAt = socket.handshake?.issued || now;
					const entries = socket.data.editing || [];
					const editing = entries
						.filter((entry) => canRead(entry.uid))
						.map((entry) => ({
							uid: entry.uid,
							documentId: entry.documentId,
							kind: strapi.contentTypes[entry.uid]?.kind ?? 'collectionType',
							contentTypeName: strapi.contentTypes[entry.uid]?.info?.displayName ?? entry.uid,
						}));
					const hidden = entries.length - editing.length;
					const existing = admins.get(user.id);
					if (existing) {
						existing.editing.push(...editing);
						existing.hiddenEditing += hidden;
						existing.connectedAt = Math.min(existing.connectedAt, connectedAt);
					} else {
						admins.set(user.id, {
							id: user.id,
							firstname: user.firstname,
							lastname: user.lastname,
							connectedAt,
							editing,
							hiddenEditing: hidden,
						});
					}
				}
			}
			const status = strapi.plugin('io').service('cluster').status();
			ctx.body = {
				data: {
					admins: [...admins.values()].map((a) => ({ ...a, connectedAt: new Date(a.connectedAt).toISOString() })),
					counts,
				},
				meta: { scope: status.clusterAdapter || status.instances <= 1 ? 'all' : 'instance' },
			};
		},

		/**
		 * Broadcasts a test event to every connected client.
		 *
		 * @route POST /io/test-event
		 * @access admin with `plugin::io.monitoring.manage`
		 * @param {{ eventName: string, data?: any }} ctx.request.body - Event.
		 * @returns {{ data: { eventName: string, recipients: number } }} Result.
		 * @throws {ValidationError} For invalid names or payloads.
		 * @sideeffect Emits to all connected sockets.
		 */
		async sendTestEvent(ctx) {
			const { eventName, data } = ctx.request.body || {};
			const nameError = validateTestEventName(strapi, eventName);
			if (nameError) {
				throw new ValidationError('Invalid test event', {
					errors: [{ path: ['eventName'], message: nameError, name: 'ValidationError' }],
				});
			}
			let payload = {};
			if (data !== undefined) {
				let serialized;
				try {
					serialized = JSON.stringify(data);
				} catch {
					serialized = undefined;
				}
				if (serialized === undefined || Buffer.byteLength(serialized) > MAX_TEST_BYTES || !withinLimits(data)) {
					throw new ValidationError('Invalid test event', {
						errors: [
							{
								path: ['data'],
								message: 'Use valid JSON up to 8 KB, 10 levels and 200 keys.',
								name: 'ValidationError',
							},
						],
					});
				}
				payload = JSON.parse(serialized);
			}
			const io = strapi.$io?.server;
			// The emit reaches every process through the adapter; the count is the cluster total.
			const recipients = io ? (await monitoring().getClusterStats()).connections.connected : 0;
			io?.emit(eventName, payload);
			monitoring().recordEvent(eventName, { source: 'test', audiences: recipients });
			ctx.body = { data: { eventName, recipients } };
		},

		/**
		 * @route POST /io/reset-stats
		 * @access admin with `plugin::io.monitoring.manage`
		 * @returns {{ data: { reset: true } }} Confirmation.
		 * @sideeffect Clears counters and the event log on every process.
		 */
		async resetStats(ctx) {
			monitoring().reset();
			await strapi
				.plugin('io')
				.service('cluster')
				.publish('stats-reset')
				.catch(() => {});
			ctx.body = { data: { reset: true } };
		},
	};
};

export { validateTestEventName, withinLimits };
