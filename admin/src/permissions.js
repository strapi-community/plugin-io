/** Admin permissions used to hide links and gate pages (the server enforces them too). */
export const PERMISSIONS = {
	settings: {
		read: [{ action: 'plugin::io.settings.read', subject: null }],
		update: [{ action: 'plugin::io.settings.update', subject: null }],
	},
	monitoring: {
		read: [{ action: 'plugin::io.monitoring.read', subject: null }],
		manage: [{ action: 'plugin::io.monitoring.manage', subject: null }],
	},
};
