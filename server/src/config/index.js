import { plugin } from './schema.js';

export default {
	default() {
		return {
			events: [],
			hooks: {},
			contentTypes: [],
			sensitiveFields: [],
			socket: {
				// `cors` and `allowRequest` are filled from the admin settings unless set here.
				serverOptions: {},
			},
		};
	},
	validator(config) {
		plugin.parse(config);
	},
};
