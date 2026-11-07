/** Synthetic e2e app: secrets come from the runner's environment, never from files. */
module.exports = ({ env }) => ({
	auth: { secret: env('ADMIN_JWT_SECRET') },
	apiToken: { salt: env('API_TOKEN_SALT') },
	transfer: { token: { salt: env('TRANSFER_TOKEN_SALT') } },
	secrets: { encryptionKey: env('ENCRYPTION_KEY') },
	// The browser suite logs in once per test; Strapi's default allows 5 logins in 5 minutes.
	rateLimit: { enabled: true, interval: { min: 5 }, max: 200 },
});
