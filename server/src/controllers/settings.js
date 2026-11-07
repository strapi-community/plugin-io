import { errors } from '@strapi/utils';
import { settingsUpdateSchema, toValidationDetails } from '../utils/settings-schema.js';

const { ValidationError } = errors;

/**
 * Admin controller for the plugin settings.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Handlers.
 */
export default ({ strapi }) => {
	const service = () => strapi.plugin('io').service('settings');

	return {
		/**
		 * @route GET /io/settings
		 * @access admin with `plugin::io.settings.read`
		 * @returns {{ data: object }} Current settings.
		 */
		async getSettings(ctx) {
			ctx.body = { data: await service().getSettings() };
		},

		/**
		 * @route PUT /io/settings
		 * @access admin with `plugin::io.settings.update`
		 * @param {object} ctx.request.body - Full or partial settings; unknown keys are rejected.
		 * @returns {{ data: object }} Saved settings.
		 * @throws {ValidationError} 400 with `details.errors[]` (path, message).
		 * @sideeffect Writes core_store and applies the settings to new connections.
		 */
		async updateSettings(ctx) {
			const parsed = settingsUpdateSchema.safeParse(ctx.request.body ?? {});
			if (!parsed.success) {
				throw new ValidationError('Invalid settings', toValidationDetails(parsed.error));
			}
			const unknownUids = Object.keys(parsed.data.events?.contentTypes || {}).filter(
				(uid) => !strapi.contentTypes[uid]
			);
			if (unknownUids.length) {
				throw new ValidationError('Invalid settings', {
					errors: unknownUids.map((uid) => ({
						path: ['events', 'contentTypes', uid],
						message: 'Unknown content type.',
						name: 'ValidationError',
					})),
				});
			}
			ctx.body = { data: await service().setSettings(parsed.data) };
		},

		/**
		 * @route GET /io/content-types
		 * @access admin with `plugin::io.settings.read`
		 * @returns {{ data: Array<object> }} `api::` content types with configured actions.
		 */
		async getContentTypes(ctx) {
			ctx.body = { data: service().getContentTypes() };
		},

		/**
		 * @route GET /io/roles
		 * @access admin with `plugin::io.settings.read`
		 * @returns {{ data: Array<object> }} Users & Permissions roles.
		 */
		async getRoles(ctx) {
			ctx.body = { data: await service().getRoles() };
		},
	};
};
