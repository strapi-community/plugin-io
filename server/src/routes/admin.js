'use strict';

/**
 * Admin routes for Socket.IO plugin
 * These routes require admin authentication
 */
module.exports = [
  // Presence Session - issues JWT token for Socket.IO connection
  {
    method: 'POST',
    path: '/presence/session',
    handler: 'presence.createSession',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
