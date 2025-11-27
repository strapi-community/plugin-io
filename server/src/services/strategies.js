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

			return strapi.entityService.findOne('plugin::users-permissions.role', user.role.id, {
				fields: ['id', 'name'],
			});
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
			// fetch all role types
			return strapi.entityService.findMany('plugin::users-permissions.role', {
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

			const apiToken = await strapi.query('admin::api-token').findOne({
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

			// update lastUsedAt if the token has not been used in the last hour
			if (!apiToken.lastUsedAt || differenceInHours(currentDate, parseISO(apiToken.lastUsedAt)) >= 1) {
				await strapi.query('admin::api-token').update({
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
			// fetch active token types
			return strapi.entityService.findMany('admin::api-token', {
				fields: ['id', 'type', 'name'],
				filters: {
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
				populate: { permissions: true },
			});
		},
	};

	return {
		role,
		token,
	};
};
