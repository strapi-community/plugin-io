const fs = require('node:fs');

/**
 * Seeds the synthetic e2e app once: a Super Admin, a read-only admin role
 * and user, public read permissions, a full-access API token and a few
 * entries. Credentials come from the runner's environment; the API token is
 * written with mode 600 to IO_E2E_SEED_OUT for the runner and never logged.
 */
module.exports = {
	register() {},

	async bootstrap({ strapi }) {
		const out = process.env.IO_E2E_SEED_OUT;
		if (!out || fs.existsSync(out)) return;
		const env = process.env;

		const roles = strapi.service('admin::role');
		const users = strapi.service('admin::user');
		const superAdmin = await roles.getSuperAdmin();
		await users.create({
			email: env.IO_E2E_EMAIL,
			firstname: 'Ada',
			lastname: 'Admin',
			password: env.IO_E2E_PASSWORD,
			isActive: true,
			registrationToken: null,
			roles: [superAdmin.id],
		});
		const viewerRole = await roles.create({
			name: 'IO viewer',
			description: 'Reads Socket.IO settings and monitoring',
		});
		await roles.assignPermissions(viewerRole.id, [
			{ action: 'plugin::io.settings.read' },
			{ action: 'plugin::io.monitoring.read' },
		]);
		await users.create({
			email: env.IO_E2E_VIEWER_EMAIL,
			firstname: 'Vic',
			lastname: 'Viewer',
			password: env.IO_E2E_VIEWER_PASSWORD,
			isActive: true,
			registrationToken: null,
			roles: [viewerRole.id],
		});

		const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
		for (const type of ['article', 'category', 'note']) {
			for (const action of ['find', 'findOne']) {
				await strapi.db
					.query('plugin::users-permissions.permission')
					.create({ data: { action: `api::${type}.${type}.${action}`, role: publicRole.id } });
			}
		}

		const token = await strapi.service('admin::api-token').create({
			name: 'io-e2e-full-access',
			description: 'Synthetic e2e token',
			type: 'full-access',
			kind: 'content-api',
			lifespan: null,
		});

		const category = await strapi.documents('api::category.category').create({ data: { name: 'Synthetic news' } });
		for (const title of ['First synthetic article', 'Second synthetic article']) {
			await strapi.documents('api::article.article').create({
				data: { title, body: 'Lorem ipsum.', secretNote: 'never sent', category: category.documentId },
				status: 'published',
			});
		}
		await strapi.documents('api::note.note').create({ data: { text: 'Synthetic note', secretNote: 'never sent' } });

		fs.writeFileSync(out, JSON.stringify({ fullAccessToken: token.accessKey }), { mode: 0o600 });
	},
};
