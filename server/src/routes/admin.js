'use strict';

/**
 * Admin routes for Socket.IO plugin.
 * All routes require admin authentication.
 */
module.exports = [
  // ─── Settings ──────────────────────────────────────
  {
    method: 'GET',
    path: '/settings',
    handler: 'settings.getSettings',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'settings.updateSettings',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },

  // ─── Content Types & Roles ─────────────────────────
  {
    method: 'GET',
    path: '/content-types',
    handler: 'settings.getContentTypes',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'GET',
    path: '/roles',
    handler: 'settings.getRoles',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },

  // ─── Monitoring ────────────────────────────────────
  {
    method: 'GET',
    path: '/stats',
    handler: 'settings.getStats',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'GET',
    path: '/event-log',
    handler: 'settings.getEventLog',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'POST',
    path: '/test-event',
    handler: 'settings.sendTestEvent',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'POST',
    path: '/reset-stats',
    handler: 'settings.resetStats',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },

  // ─── Presence ──────────────────────────────────────
  {
    method: 'POST',
    path: '/presence/session',
    handler: 'presence.createSession',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
];
