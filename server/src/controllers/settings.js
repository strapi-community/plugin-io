import { z } from 'zod';
import net from 'net';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

/**
 * Validates a CORS origin: https? URL, * or localhost with optional port.
 * @param {string} origin
 * @returns {boolean}
 */
function isValidCorsOrigin(origin) {
  if (typeof origin !== 'string') return false;
  if (origin === '*') return true;
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validates a string looks like an IPv4, IPv6 or CIDR block.
 * @param {string} value
 * @returns {boolean}
 */
function isValidIpOrCidr(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  const [addr, mask] = value.split('/');
  if (mask !== undefined) {
    const m = Number.parseInt(mask, 10);
    if (!Number.isFinite(m) || m < 0 || m > 128) return false;
  }
  return net.isIP(addr) !== 0;
}

/**
 * Zod schema for validating incoming settings updates.
 * Intentionally permissive with passthrough to allow forward-compatible fields.
 */
const settingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    cors: z
      .object({
        origins: z.array(
          z.string().refine(isValidCorsOrigin, {
            message: 'Each origin must be a valid http(s) URL or "*"',
          })
        ).optional(),
      })
      .passthrough()
      .optional(),
    connection: z
      .object({
        maxConnections: z.number().int().positive().max(100000).optional(),
        pingTimeout: z.number().int().positive().max(600000).optional(),
        pingInterval: z.number().int().positive().max(600000).optional(),
        connectionTimeout: z.number().int().positive().max(600000).optional(),
      })
      .optional(),
    security: z
      .object({
        requireAuthentication: z.boolean().optional(),
        rateLimiting: z
          .object({
            enabled: z.boolean().optional(),
            maxEventsPerSecond: z.number().int().positive().max(100000).optional(),
          })
          .optional(),
        ipWhitelist: z.array(z.string().refine(isValidIpOrCidr, {
          message: 'Each entry must be a valid IPv4/IPv6 address or CIDR',
        })).max(1000).optional(),
        ipBlacklist: z.array(z.string().refine(isValidIpOrCidr, {
          message: 'Each entry must be a valid IPv4/IPv6 address or CIDR',
        })).max(1000).optional(),
      })
      .optional(),
    events: z
      .object({
        customEventNames: z.boolean().optional(),
        includeRelations: z.boolean().optional(),
        excludeFields: z.array(z.string()).optional(),
        onlyPublished: z.boolean().optional(),
      })
      .optional(),
    rooms: z.object({}).passthrough().optional(),
    redis: z
      .object({
        enabled: z.boolean().optional(),
        url: z.string().optional(),
      })
      .optional(),
    namespaces: z.object({}).passthrough().optional(),
    middleware: z.object({}).passthrough().optional(),
    monitoring: z
      .object({
        enableConnectionLogging: z.boolean().optional(),
        enableEventLogging: z.boolean().optional(),
        maxEventLogSize: z.number().int().positive().optional(),
      })
      .optional(),
    entitySubscriptions: z.object({}).passthrough().optional(),
    presence: z.object({}).passthrough().optional(),
    livePreview: z.object({}).passthrough().optional(),
    fieldLevelChanges: z.object({}).passthrough().optional(),
    rolePermissions: z.record(z.any()).optional(),
  })
  .passthrough();

/**
 * Admin controller for Socket.IO settings.
 * All routes require `admin::isAuthenticatedAdmin` policy.
 *
 * @route GET  /io/settings        - Retrieve settings
 * @route PUT  /io/settings        - Update settings
 * @route GET  /io/content-types   - List api:: content types
 * @route GET  /io/roles           - List users-permissions roles
 * @route GET  /io/stats           - Socket.IO runtime stats
 * @route POST /io/test-event      - Emit a test event
 * @route POST /io/reset-stats     - Reset monitoring counters
 * @route GET  /io/event-log       - Retrieve recent event log
 */
export default ({ strapi }) => {
  const getSettingsService = () =>
    strapi.plugin('io').service('settings');

  return {
    /**
     * @route GET /io/settings
     * @returns {{ data: object }} Current settings
     */
    async getSettings(ctx) {
      const settings = await getSettingsService().getSettings();
      ctx.body = { data: settings };
    },

    /**
     * @route PUT /io/settings
     * @returns {{ data: object }} Updated settings
     * @throws {ValidationError} If body fails Zod validation
     */
    async updateSettings(ctx) {
      const parsed = settingsSchema.safeParse(ctx.request.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid settings',
          parsed.error.flatten().fieldErrors
        );
      }
      const settings = await getSettingsService().setSettings(parsed.data);
      ctx.body = { data: settings };
    },

    /**
     * @route GET /io/content-types
     * @returns {{ data: Array<{ uid: string; displayName: string }> }}
     */
    async getContentTypes(ctx) {
      const contentTypes = getSettingsService().getContentTypes();
      ctx.body = { data: contentTypes };
    },

    /**
     * @route GET /io/roles
     * @returns {{ data: Array }}
     */
    async getRoles(ctx) {
      const roles = await getSettingsService().getRoles();
      ctx.body = { data: roles };
    },

    /**
     * @route GET /io/stats
     * @returns {{ data: object }} Live socket statistics
     */
    async getStats(ctx) {
      const io = strapi.$io;
      if (!io?.server) {
        ctx.body = { data: { connections: { connected: 0, sockets: [], rooms: [] }, events: { totalEvents: 0, eventsPerSecond: '0.00' } } };
        return;
      }

      const sockets = await io.server.fetchSockets();
      const roomMap = io.server.adapter?.rooms;
      const rooms = roomMap
        ? [...roomMap.keys()].filter((r) => !sockets.find((s) => s.id === r))
        : [];

      ctx.body = {
        data: {
          connections: {
            connected: sockets.length,
            rooms,
            sockets: sockets.map((s) => ({
              id: s.id,
              connected: s.connected,
              handshake: {
                address: s.handshake?.address,
                time: s.handshake?.time,
              },
              user: s.data?.user
                ? {
                    id: s.data.user.id,
                    username: s.data.user.username || s.data.user.firstname,
                    email: s.data.user.email,
                    role: s.data.user.role?.name || s.data.user.role,
                  }
                : null,
            })),
          },
          events: {
            totalEvents: strapi.$io._eventCount || 0,
            eventsPerSecond: strapi.$io._eps || '0.00',
          },
        },
      };
    },

    /**
     * Broadcasts a test event to all connected Socket.IO clients.
     *
     * Validates the event name against `[a-zA-Z0-9:._-]` (max 100 chars) and
     * caps the serialized payload at 32 KB so an admin can't trivially flood
     * connected sockets with massive payloads.
     *
     * @route POST /io/test-event
     * @returns {{ ok: true }}
     * @throws {ValidationError} When eventName is missing/invalid or data too large
     */
    async sendTestEvent(ctx) {
      const { eventName, data } = ctx.request.body || {};
      if (!eventName || typeof eventName !== 'string') {
        throw new ValidationError('eventName is required');
      }

      const securityService = strapi.plugin('io')?.service?.('security');
      const isValidName = securityService?.validateEventName
        ? securityService.validateEventName(eventName)
        : /^[a-zA-Z0-9:._-]+$/.test(eventName) && eventName.length < 100;

      if (!isValidName) {
        throw new ValidationError('eventName must match [a-zA-Z0-9:._-]{1,99}');
      }

      let safeData = {};
      if (data !== undefined) {
        try {
          const serialized = JSON.stringify(data);
          if (serialized.length > 32 * 1024) {
            throw new ValidationError('Test event data too large (max 32 KB)');
          }
          safeData = JSON.parse(serialized);
        } catch (err) {
          if (err instanceof ValidationError) throw err;
          throw new ValidationError('Test event data is not JSON-serializable');
        }
      }

      const io = strapi.$io;
      if (io?.server) {
        io.server.emit(eventName, safeData);
      }
      ctx.body = { ok: true };
    },

    /**
     * @route POST /io/reset-stats
     * @returns {{ ok: true }}
     */
    async resetStats(ctx) {
      if (strapi.$io) {
        strapi.$io._eventCount = 0;
        strapi.$io._eps = '0.00';
        strapi.$io._eventLog = [];
      }
      ctx.body = { ok: true };
    },

    /**
     * @route GET /io/event-log
     * @query {number} [limit=50]
     * @returns {{ data: Array }}
     */
    async getEventLog(ctx) {
      const limit = parseInt(ctx.query.limit, 10) || 50;
      const log = strapi.$io?._eventLog || [];
      ctx.body = { data: log.slice(-limit) };
    },

    /**
     * @route GET /io/online-users
     * @returns {{ data: { users: Array, counts: object } }}
     */
    async getOnlineUsers(ctx) {
      const io = strapi.$io;
      if (!io?.server) {
        ctx.body = { data: { users: [], counts: { total: 0, admin: 0, authenticated: 0, anonymous: 0 } } };
        return;
      }

      const sockets = await io.server.fetchSockets();
      const now = Date.now();
      const users = [];
      const seen = new Set();

      for (const s of sockets) {
        const user = s.data?.user;
        const key = user?.id ? `${user.id}` : s.id;
        if (seen.has(key)) continue;
        seen.add(key);

        const connectedAt = s.handshake?.time ? new Date(s.handshake.time).getTime() : now;
        const isAdmin = !!(user?.role === 'Super Admin' || user?.role?.name === 'Super Admin');

        users.push({
          socketId: s.id,
          user: {
            id: user?.id || null,
            firstname: user?.firstname || null,
            lastname: user?.lastname || null,
            username: user?.username || user?.firstname || 'Anonymous',
            email: user?.email || null,
            isAdmin,
          },
          onlineFor: now - connectedAt,
          isEditing: !!(s.data?.editing?.length),
          editingEntities: s.data?.editing || [],
        });
      }

      const counts = {
        total: users.length,
        admin: users.filter((u) => u.user.isAdmin).length,
        authenticated: users.filter((u) => u.user.id !== null).length,
        anonymous: users.filter((u) => u.user.id === null).length,
      };

      ctx.body = { data: { users, counts } };
    },
  };
};
