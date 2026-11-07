/**
 * Presence controller: issues one-time Socket.IO session tokens for admins.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Handlers.
 */
export default ({ strapi }) => ({
	/**
	 * @route POST /io/presence/session
	 * @access any authenticated admin (joining a document also requires Content Manager read permission)
	 * @returns {{ data: { token: string, expiresAt: string, wsPath: string, enabled: boolean } }} Session.
	 * @throws 429 when 10,000 unused tokens are pending across all admins.
	 * @sideeffect Stores a one-time token (hashed) for two minutes, in memory or, with several processes, in `plugin_io_presence_tokens` (at most five per admin; the oldest is dropped).
	 */
	async createSession(ctx) {
		const user = ctx.state.user;
		if (!user?.id) return ctx.unauthorized();
		const settings = strapi.plugin('io').service('settings').current();
		const session = await strapi
			.plugin('io')
			.service('presence')
			.createSessionToken(user, { sessionId: ctx.state.session?.id ?? null });
		if (!session) return ctx.tooManyRequests('Too many pending presence sessions. Try again later.');
		const { token, expiresAt } = session;
		ctx.body = {
			data: {
				token,
				expiresAt: new Date(expiresAt).toISOString(),
				wsPath: strapi.$io?.server?.path() ?? '/socket.io',
				enabled: settings.presence.enabled,
				showTypingIndicator: settings.presence.showTypingIndicator,
			},
		};
	},
});
