'use strict';

const { castArray, isNil, pipe, every } = require('lodash/fp');
const { differenceInHours, parseISO } = require('date-fns');
const { getService } = require('../utils/getService');
const { API_TOKEN_TYPE } = require('../utils/constants');
const { UnauthorizedError, ForbiddenError } = require('@strapi/utils').errors;

module.exports = ({ strapi }) => {
	const apiTokenService = getService({ type: 'admin', plugin: 'api-token' });
	const jwtService = getService({ name: 'jwt', plugin: 'users-permissions' });
	const userService = getService({ name: 'user', plugin: 'users-permissions' });
	const role = {
		name: 'io-role',
		credentials: function (role) {
			return `${this.name}-${role.id}`;
		},
		authenticate: async function (auth) {
			// adapted from https://github.com/strapi/strapi/blob/main/packages/plugins/users-permissions/server/strategies/users-permissions.js#L12
			const token = await jwtService.verify(auth.token);

			if (!token) {
				throw new UnauthorizedError('Invalid credentials');
			}

			const { id } = token;

			// Invalid token
			if (id === undefined) {
				throw new UnauthorizedError('Invalid credentials');
			}

			const user = await userService.fetchAuthenticatedUser(id);

			// No user associated to the token
			if (!user) {
				throw new UnauthorizedError('Invalid credentials');
			}

			const advancedSettings = await strapi
				.store({ type: 'plugin', name: 'users-permissions' })
				.get({ key: 'advanced' });

			// User not confirmed
			if (advancedSettings.email_confirmation && !user.confirmed) {
				throw new UnauthorizedError('Invalid credentials');
			}

			// User blocked
			if (user.blocked) {
				throw new UnauthorizedError('Invalid credentials');
			}

			// Find role using Document Service API (Strapi v5)
			const roles = await strapi.documents('plugin::users-permissions.role').findMany({
				filters: { id: user.role.id },
				fields: ['id', 'name'],
				limit: 1,
			});
			return roles.length > 0 ? roles[0] : null;
		},
		verify: function (auth, config) {
			// adapted from https://github.com/strapi/strapi/blob/main/packages/plugins/users-permissions/server/strategies/users-permissions.js#L80
			const { ability } = auth;

			if (!ability) {
				throw new UnauthorizedError();
			}

			const isAllowed = pipe(
				castArray,
				every((scope) => ability.can(scope)),
			)(config.scope);

			if (!isAllowed) {
				throw new ForbiddenError();
			}
		},
		getRoomName: function (role) {
			return `${this.name}-${role.name.toLowerCase()}`;
		},
		getRooms: function () {
			// fetch all role types using Document Service API (Strapi v5)
			return strapi.documents('plugin::users-permissions.role').findMany({
				fields: ['id', 'name'],
				populate: { permissions: true },
			});
		},
	};

	const token = {
		name: 'io-token',
		credentials: function (token) {
			return token;
		},
		authenticate: async function (auth) {
			// adapted from https://github.com/strapi/strapi/blob/main/packages/core/admin/server/strategies/api-token.js#L30
			const token = auth.token;

			if (!token) {
				throw new UnauthorizedError('Invalid credentials');
			}

			// ⚠️ LEGITIMATE EXCEPTION: admin::api-token is a Strapi Core Admin entity
			// Official Strapi implementation uses strapi.db.query() for admin::api-token
			// Source: https://github.com/strapi/strapi/blob/main/packages/core/admin/server/strategies/api-token.js
			// This is NOT a mistake - Strapi Core itself uses Query Engine for admin entities
			const apiToken = await strapi.db.query('admin::api-token').findOne({
				where: { accessKey: apiTokenService.hash(token) },
				select: ['id', 'name', 'type', 'lastUsedAt', 'expiresAt'],
				populate: ['permissions'],
			});

			// token not found
			if (!apiToken) {
				throw new UnauthorizedError('Invalid credentials');
			}

			const currentDate = new Date();
			if (!isNil(apiToken.expiresAt)) {
				const expirationDate = new Date(apiToken.expiresAt);
				// token has expired
				if (expirationDate < currentDate) {
					throw new UnauthorizedError('Token expired');
				}
			}

			// Update lastUsedAt if the token has not been used in the last hour
			// ⚠️ LEGITIMATE EXCEPTION: Using Query Engine as per Strapi Core implementation
			if (!apiToken.lastUsedAt || differenceInHours(currentDate, parseISO(apiToken.lastUsedAt)) >= 1) {
				await strapi.db.query('admin::api-token').update({
					where: { id: apiToken.id },
					data: { lastUsedAt: currentDate },
				});
			}

			return apiToken;
		},
		verify: function (auth, config) {
			// adapted from https://github.com/strapi/strapi/blob/main/packages/core/admin/server/strategies/api-token.js#L82
			const { credentials: apiToken, ability } = auth;
			if (!apiToken) {
				throw new UnauthorizedError('Token not found');
			}

			if (!isNil(apiToken.expiresAt)) {
				const currentDate = new Date();
				const expirationDate = new Date(apiToken.expiresAt);
				// token has expired
				if (expirationDate < currentDate) {
					throw new UnauthorizedError('Token expired');
				}
			}

			if (apiToken.type === API_TOKEN_TYPE.FULL_ACCESS) {
				return;
			} else if (apiToken.type === API_TOKEN_TYPE.READ_ONLY) {
				const scopes = castArray(config.scope);

				if (config.scope && scopes.every(isReadScope)) {
					return;
				}
			} else if (apiToken.type === API_TOKEN_TYPE.CUSTOM) {
				if (!ability) {
					throw new ForbiddenError();
				}

				const scopes = castArray(config.scope);

				const isAllowed = scopes.every((scope) => ability.can(scope));

				if (isAllowed) {
					return;
				}
			}

			throw new ForbiddenError();
		},
		getRoomName: function (token) {
			return `${this.name}-${token.name.toLowerCase()}`;
		},
		getRooms: function () {
			// Fetch active token types
			// ⚠️ LEGITIMATE EXCEPTION: Using Query Engine as per Strapi Core implementation
			return strapi.db.query('admin::api-token').findMany({
				select: ['id', 'type', 'name'],
				where: {
					$or: [
						{
							expiresAt: {
								$gte: new Date(),
							},
						},
						{
							expiresAt: null,
						},
					],
				},
				populate: ['permissions'],
			});
		},
	};

	return {
		role,
		token,
	};
};
