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
	socket: { serverOptions: { cors: { origin: 'https://app.example.com' } } },
};

async function run(): Promise<number> {
	strapi.$io.server.emit('hello', { ok: true });
	await strapi.$io.raw({ event: 'notice', data: { a: 1 }, rooms: ['io-role-public'] });
	return strapi.$io.emit({ event: 'publish', schema: { uid: 'api::page.page', singularName: 'page' }, data: {} });
}

const onlyPublished: PluginSettings['events']['onlyPublished'] = true;
export { config, run, onlyPublished };
