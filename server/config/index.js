'use strict';

module.exports = {
	default() {
		return {
			events: [],
			hooks: {},
			socket: {
				serverOptions: {
					// Keep Strapi transfer / other WS upgrades alive on the same HTTP server (#112).
					destroyUpgrade: false,
					cors: { origin: 'http://127.0.0.1:8080', methods: ['GET', 'POST'] },
				},
			},
		};
	},
	validator(config) {
		// no-op validator for now; assume user config is valid
	},
};
