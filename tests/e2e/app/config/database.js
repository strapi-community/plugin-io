const path = require('node:path');

module.exports = () => ({
	connection: {
		client: 'sqlite',
		connection: { filename: path.join(__dirname, '..', '.tmp', 'e2e.db') },
		useNullAsDefault: true,
	},
});
