// PostgreSQL from DATABASE_URL, set by scripts/cluster-acceptance.mjs. Eight
// processes share it, so each keeps a small pool.
module.exports = ({ env }) => ({
	connection: {
		client: 'postgres',
		connection: { connectionString: env('DATABASE_URL') },
		pool: { min: 0, max: 6 },
	},
});
