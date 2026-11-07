/**
 * Resolves the client IP for a raw Node request exactly like Koa's
 * `ctx.request.ip`, using Strapi's own `server.proxy` settings
 * (`app.proxy`, `app.proxyIpHeader`, `app.maxIpsCount`).
 *
 * Forwarded headers are only read when Strapi trusts the proxy, so the
 * rate limiter and IP rules use the same address as Strapi's own middlewares.
 *
 * @param {import('node:http').IncomingMessage} req - Raw request of the handshake.
 * @param {{ proxy?: boolean, proxyIpHeader?: string, maxIpsCount?: number } | undefined} app - Strapi's Koa app.
 * @returns {string} The client IP, or `'unknown'`.
 * @see https://docs.strapi.io/cms/configurations/server
 */
function getClientIp(req, app) {
	const socketIp = req?.socket?.remoteAddress || 'unknown';
	if (!app?.proxy) return socketIp;

	const headerName = String(app.proxyIpHeader || 'X-Forwarded-For').toLowerCase();
	const raw = req?.headers?.[headerName];
	const value = Array.isArray(raw) ? raw.join(',') : raw;
	if (typeof value !== 'string' || value.length === 0) return socketIp;

	let ips = value
		.split(',')
		.map((ip) => ip.trim())
		.filter(Boolean);
	const maxIpsCount = Number(app.maxIpsCount) || 0;
	if (maxIpsCount > 0) ips = ips.slice(-maxIpsCount);
	return ips[0] || socketIp;
}

export { getClientIp };
