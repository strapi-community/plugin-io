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
	 * @sideeffect Stores a one-time token in memory for two minutes.
	 */
	async createSession(ctx) {
		const user = ctx.state.user;
		if (!user?.id) return ctx.unauthorized();
		const settings = strapi.plugin('io').service('settings').current();
		const { token, expiresAt } = strapi
			.plugin('io')
			.service('presence')
			.createSessionToken(user, ctx.state.userAbility);
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
