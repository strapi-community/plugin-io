import { z } from 'zod';
import { errors } from '@strapi/utils';

const { ValidationError } = errors;

/**
 * Zod schema for validating incoming settings updates.
 * Intentionally permissive with passthrough to allow forward-compatible fields.
 */
const settingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    cors: z
      .object({
        origins: z.array(z.string().url()).optional(),
      })
      .passthrough()
      .optional(),
    connection: z
      .object({
        maxConnections: z.number().int().positive().optional(),
        pingTimeout: z.number().int().positive().optional(),
        pingInterval: z.number().int().positive().optional(),
        connectionTimeout: z.number().int().positive().optional(),
      })
      .optional(),
    security: z
      .object({
        requireAuthentication: z.boolean().optional(),
        rateLimiting: z
          .object({
            enabled: z.boolean().optional(),
            maxEventsPerSecond: z.number().int().positive().optional(),
          })
          .optional(),
        ipWhitelist: z.array(z.string()).optional(),
        ipBlacklist: z.array(z.string()).optional(),
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
      const rooms = [...io.server.adapter.rooms.keys()].filter(
        (r) => !sockets.find((s) => s.id === r)
      );

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
     * @route POST /io/test-event
     * @returns {{ ok: true }}
     */
    async sendTestEvent(ctx) {
      const { eventName, data } = ctx.request.body || {};
      if (!eventName) {
        throw new ValidationError('eventName is required');
      }
      const io = strapi.$io;
      if (io?.server) {
        io.server.emit(eventName, data || {});
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
  };
};
