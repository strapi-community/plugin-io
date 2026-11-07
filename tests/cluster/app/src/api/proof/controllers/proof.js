'use strict';

/**
 * Test-only controller of the cluster acceptance app: passes a client-supplied
 * socket id or room to the $io helpers, like an application controller might.
 * The app listens on loopback only and holds synthetic data.
 */
module.exports = {
	async join(ctx) {
		const { socketId, room } = ctx.request.body ?? {};
		ctx.body = { result: await strapi.$io.joinRoom(String(socketId), String(room)) };
	},
	async disconnect(ctx) {
		const { socketId } = ctx.request.body ?? {};
		ctx.body = { result: await strapi.$io.disconnectSocket(String(socketId)) };
	},
	async emit(ctx) {
		const { room, event } = ctx.request.body ?? {};
		await strapi.$io.raw({ event: String(event), data: { proof: true }, rooms: [String(room)] });
		ctx.body = { ok: true };
	},
};
