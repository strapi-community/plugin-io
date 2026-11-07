import type { Core } from '@strapi/types';
import type { PluginSettings, SocketData, SocketIOConfig } from '../../types';

declare const strapi: Core.Strapi;

const config: SocketIOConfig = {
	contentTypes: [
		'api::article.article',
		{ uid: 'api::page.page', actions: ['publish', 'unpublish'], populate: ['seo'] },
	],
	hooks: { init: async ({ $io, io }) => void ($io === io && $io.server.engine) },
	events: [
		{
			name: 'whoami',
			handler: (_ctx, socket) => {
				const data = socket.data as SocketData;
				if (data.kind === 'user') void data.user?.id;
			},
		},
		{ name: 'admin-only', admin: true, handler: () => undefined },
	],
	socket: { serverOptions: { cors: { origin: 'https://app.example.com' } }, adapter: 'postgres', websocketOnly: true },
	cluster: { enabled: 'auto', pollInterval: 3000 },
};

const redis: SocketIOConfig = {
	contentTypes: [],
	socket: { adapter: { type: 'redis', url: 'redis://cache.example.test:6379', requestsTimeout: 5000 } },
};

async function unfollow(socketId: string): Promise<boolean> {
	const result = await strapi.$io.unsubscribeFromEntity(socketId, 'api::article.article', 'abc123');
	const list = await strapi.$io.getEntitySubscriptions(socketId);
	return result.success && list.success;
}

async function run(): Promise<number> {
	strapi.$io.server.emit('hello', { ok: true });
	await strapi.$io.raw({ event: 'notice', data: { a: 1 }, rooms: ['io-role-public'] });
	return strapi.$io.emit({ event: 'publish', schema: { uid: 'api::page.page', singularName: 'page' }, data: {} });
}

const onlyPublished: PluginSettings['events']['onlyPublished'] = true;
const maxPerSocket: PluginSettings['subscriptions']['maxPerSocket'] = 100;

async function follow(socketId: string): Promise<string | null> {
	const result = await strapi.$io.subscribeToEntity(socketId, 'api::article.article', 'abc123');
	return result.success ? result.documentId : result.error;
}
async function moveAndKick(socketId: string): Promise<boolean> {
	const joined: boolean = await strapi.$io.joinRoom(socketId, 'premium');
	const left: boolean = await strapi.$io.leaveRoom(socketId, 'trial');
	const kicked: boolean = await strapi.$io.disconnectSocket(socketId);
	return joined && left && kicked;
}
export { config, redis, run, onlyPublished, maxPerSocket, follow, unfollow, moveAndKick };
