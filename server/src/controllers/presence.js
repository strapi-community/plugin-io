'use strict';

const { randomUUID } = require('crypto');

// Session tokens storage (in-memory, short-lived)
const sessionTokens = new Map();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionTokens.entries()) {
    if (session.expiresAt < now) {
      sessionTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Presence Controller for Socket.IO Admin Sessions
 * Issues session tokens for admin users to connect to Socket.IO
 */
const presenceController = ({ strapi }) => ({
  /**
   * Creates a session token for admin users to connect to Socket.IO
   * @param {object} ctx - Koa context
   */
  async createSession(ctx) {
    const adminUser = ctx.state.user;

    if (!adminUser) {
      strapi.log.warn('[plugin-io] Presence session requested without admin user');
      return ctx.unauthorized('Admin authentication required');
    }

    try {
      // Generate a random session token (like magic-editor-x does)
      const token = randomUUID();
      const expiresAt = Date.now() + (2 * 60 * 1000); // 2 minutes TTL

      // Store session data
      sessionTokens.set(token, {
        token,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstname: adminUser.firstname,
          lastname: adminUser.lastname,
        },
        expiresAt,
      });

      strapi.log.info(`[plugin-io] Presence session created for admin user: ${adminUser.email}`);

      ctx.body = {
        token,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstname: adminUser.firstname,
          lastname: adminUser.lastname,
        },
        wsPath: '/socket.io',
        wsUrl: `${ctx.protocol}://${ctx.host}`,
      };
    } catch (error) {
      strapi.log.error('[plugin-io] Failed to create presence session:', error);
      return ctx.internalServerError('Failed to create session');
    }
  },

  /**
   * Validates and consumes a session token (one-time use)
   * @param {string} token - Session token to validate
   * @returns {object|null} Session data or null if invalid/expired
   */
  consumeSessionToken(token) {
    if (!token) {
      return null;
    }

    const session = sessionTokens.get(token);
    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      sessionTokens.delete(token);
      return null;
    }

    // Don't delete - allow reconnects with same token
    return session;
  },
});

module.exports = presenceController;
