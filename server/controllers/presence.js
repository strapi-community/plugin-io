'use strict';

const { randomUUID, createHash } = require('crypto');

// Session tokens storage (in-memory, short-lived)
// Map: tokenHash -> { session data }
const sessionTokens = new Map();

// Active socket sessions - tracks which sockets are using which tokens
// Map: socketId -> tokenHash
const activeSockets = new Map();

// Token refresh tracking - prevents too frequent refreshes
// Map: adminUserId -> lastRefreshTime
const refreshThrottle = new Map();

// Configuration
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes TTL
const REFRESH_COOLDOWN = 30 * 1000; // 30 seconds between refreshes
const CLEANUP_INTERVAL = 2 * 60 * 1000; // Cleanup every 2 minutes

/**
 * Hashes a token for secure storage (don't store plaintext tokens)
 * @param {string} token - The plaintext token
 * @returns {string} SHA-256 hash of the token
 */
const hashToken = (token) => {
  return createHash('sha256').update(token).digest('hex');
};

/**
 * Cleanup expired tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [tokenHash, session] of sessionTokens.entries()) {
    if (session.expiresAt < now) {
      sessionTokens.delete(tokenHash);
      cleaned++;
    }
  }
  
  // Also cleanup stale refresh throttle entries (older than 1 hour)
  for (const [userId, lastRefresh] of refreshThrottle.entries()) {
    if (now - lastRefresh > 60 * 60 * 1000) {
      refreshThrottle.delete(userId);
    }
  }
  
  if (cleaned > 0) {
    console.log(`[plugin-io] [CLEANUP] Removed ${cleaned} expired session tokens`);
  }
}, CLEANUP_INTERVAL);

/**
 * Presence Controller for Socket.IO Admin Sessions
 * Issues secure session tokens for admin users to connect to Socket.IO
 */
module.exports = ({ strapi }) => ({
  /**
   * Creates a session token for admin users to connect to Socket.IO
   * Implements rate limiting and secure token storage
   * @param {object} ctx - Koa context
   */
  async createSession(ctx) {
    const adminUser = ctx.state.user;

    if (!adminUser) {
      strapi.log.warn('[plugin-io] Presence session requested without admin user');
      return ctx.unauthorized('Admin authentication required');
    }

    // Rate limiting - prevent token flooding
    const lastRefresh = refreshThrottle.get(adminUser.id);
    const now = Date.now();
    
    if (lastRefresh && (now - lastRefresh) < REFRESH_COOLDOWN) {
      const waitTime = Math.ceil((REFRESH_COOLDOWN - (now - lastRefresh)) / 1000);
      strapi.log.warn(`[plugin-io] Rate limit: User ${adminUser.id} must wait ${waitTime}s`);
      return ctx.tooManyRequests(`Please wait ${waitTime} seconds before requesting a new session`);
    }

    try {
      // Generate a cryptographically secure random token
      const token = randomUUID();
      const tokenHash = hashToken(token);
      const expiresAt = now + SESSION_TTL;

      // Store session data with hashed token (never store plaintext)
      sessionTokens.set(tokenHash, {
        tokenHash,
        userId: adminUser.id,
        user: {
          id: adminUser.id,
          // Only store minimal user data needed for display
          firstname: adminUser.firstname,
          lastname: adminUser.lastname,
        },
        createdAt: now,
        expiresAt,
        usageCount: 0,
        maxUsage: 10, // Max reconnects with same token
      });

      // Update rate limit tracker
      refreshThrottle.set(adminUser.id, now);

      strapi.log.info(`[plugin-io] Presence session created for admin user: ${adminUser.id}`);

      ctx.body = {
        token, // Send plaintext token to client (only time it's exposed)
        expiresAt,
        refreshAfter: now + (SESSION_TTL * 0.7), // Suggest refresh at 70% of TTL
        wsPath: '/socket.io',
        wsUrl: `${ctx.protocol}://${ctx.host}`,
      };
    } catch (error) {
      strapi.log.error('[plugin-io] Failed to create presence session:', error);
      return ctx.internalServerError('Failed to create session');
    }
  },

  /**
   * Validates a session token and tracks usage
   * Implements usage limits to prevent token abuse
   * @param {string} token - Session token to validate
   * @returns {object|null} Session data or null if invalid/expired
   */
  consumeSessionToken(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const tokenHash = hashToken(token);
    const session = sessionTokens.get(tokenHash);
    
    if (!session) {
      strapi.log.debug('[plugin-io] Token not found in session store');
      return null;
    }

    const now = Date.now();

    // Check expiration
    if (session.expiresAt < now) {
      sessionTokens.delete(tokenHash);
      strapi.log.debug('[plugin-io] Token expired, removed from store');
      return null;
    }

    // Check usage limit (prevent unlimited reuse)
    if (session.usageCount >= session.maxUsage) {
      strapi.log.warn(`[plugin-io] Token usage limit exceeded for user ${session.userId}`);
      sessionTokens.delete(tokenHash);
      return null;
    }

    // Increment usage counter
    session.usageCount++;
    session.lastUsed = now;

    return session;
  },

  /**
   * Registers a socket as using a specific token
   * @param {string} socketId - Socket ID
   * @param {string} token - The token being used
   */
  registerSocket(socketId, token) {
    if (!socketId || !token) return;
    const tokenHash = hashToken(token);
    activeSockets.set(socketId, tokenHash);
  },

  /**
   * Unregisters a socket when it disconnects
   * @param {string} socketId - Socket ID
   */
  unregisterSocket(socketId) {
    activeSockets.delete(socketId);
  },

  /**
   * Invalidates all sessions for a specific user (e.g., on logout)
   * @param {number} userId - User ID to invalidate
   * @returns {number} Number of sessions invalidated
   */
  invalidateUserSessions(userId) {
    let invalidated = 0;
    
    for (const [tokenHash, session] of sessionTokens.entries()) {
      if (session.userId === userId) {
        sessionTokens.delete(tokenHash);
        invalidated++;
      }
    }
    
    // Also remove from refresh throttle
    refreshThrottle.delete(userId);
    
    strapi.log.info(`[plugin-io] Invalidated ${invalidated} sessions for user ${userId}`);
    return invalidated;
  },

  /**
   * Gets session statistics (for monitoring) - internal method
   * @returns {object} Session statistics
   */
  getSessionStatsInternal() {
    const now = Date.now();
    let active = 0;
    let expiringSoon = 0;
    
    for (const session of sessionTokens.values()) {
      if (session.expiresAt > now) {
        active++;
        // Expiring in less than 2 minutes
        if (session.expiresAt - now < 2 * 60 * 1000) {
          expiringSoon++;
        }
      }
    }
    
    return {
      activeSessions: active,
      expiringSoon,
      activeSocketConnections: activeSockets.size,
      sessionTTL: SESSION_TTL,
      refreshCooldown: REFRESH_COOLDOWN,
    };
  },

  /**
   * HTTP Handler: Gets session statistics for admin monitoring
   * @param {object} ctx - Koa context
   */
  async getSessionStats(ctx) {
    const adminUser = ctx.state.user;
    
    if (!adminUser) {
      return ctx.unauthorized('Admin authentication required');
    }

    try {
      const stats = this.getSessionStatsInternal();
      ctx.body = { data: stats };
    } catch (error) {
      strapi.log.error('[plugin-io] Failed to get session stats:', error);
      return ctx.internalServerError('Failed to get session statistics');
    }
  },

  /**
   * HTTP Handler: Invalidates all sessions for a specific user
   * @param {object} ctx - Koa context
   */
  async invalidateUserSessionsHandler(ctx) {
    const adminUser = ctx.state.user;
    
    if (!adminUser) {
      return ctx.unauthorized('Admin authentication required');
    }

    const { userId } = ctx.params;
    
    if (!userId) {
      return ctx.badRequest('User ID is required');
    }

    try {
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        return ctx.badRequest('Invalid user ID');
      }

      // Call internal method to invalidate sessions
      const invalidated = this.invalidateUserSessions(userIdNum);
      
      strapi.log.info(`[plugin-io] Admin ${adminUser.id} invalidated ${invalidated} sessions for user ${userIdNum}`);
      
      ctx.body = { 
        data: { 
          userId: userIdNum, 
          invalidatedSessions: invalidated,
          message: `Successfully invalidated ${invalidated} session(s)`,
        } 
      };
    } catch (error) {
      strapi.log.error('[plugin-io] Failed to invalidate user sessions:', error);
      return ctx.internalServerError('Failed to invalidate sessions');
    }
  },
});
