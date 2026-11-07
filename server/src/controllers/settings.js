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

	/**
	 * Parses a settings body with the strict schema and checks that every
	 * content type exists.
	 *
	 * @param {unknown} body - Request body.
	 * @returns {object} Validated update.
	 * @throws {ValidationError} With `details.errors[]` (path, message).
	 */
	const parseUpdate = (body) => {
		const parsed = settingsUpdateSchema.safeParse(body ?? {});
		if (!parsed.success) {
			throw new ValidationError('Invalid settings', toValidationDetails(parsed.error));
		}
		const unknownUids = Object.keys(parsed.data.events?.contentTypes || {}).filter((uid) => !strapi.contentTypes[uid]);
		if (unknownUids.length) {
			throw new ValidationError('Invalid settings', {
				errors: unknownUids.map((uid) => ({
					path: ['events', 'contentTypes', uid],
					message: 'Unknown content type.',
					name: 'ValidationError',
				})),
			});
		}
		return parsed.data;
	};

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
			ctx.body = { data: await service().setSettings(parseUpdate(ctx.request.body)) };
		},

		/**
		 * Validates an imported settings file and returns the settings it would
		 * produce, without saving. The admin shows the differences and applies
		 * them to the form only after confirmation; Save then uses
		 * `PUT /io/settings` as usual.
		 *
		 * @route POST /io/settings/validate
		 * @access admin with `plugin::io.settings.update`
		 * @param {object} ctx.request.body - Exported settings document (full or partial); unknown keys are rejected.
		 * @returns {{ data: object }} Resulting settings (not saved).
		 * @throws {ValidationError} 400 with `details.errors[]` (path, message).
		 */
		async validateSettings(ctx) {
			ctx.body = { data: await service().preview(parseUpdate(ctx.request.body)) };
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
