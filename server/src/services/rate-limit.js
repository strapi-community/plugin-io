/**
 * Creates a token bucket that allows `ratePerSecond` events per second with a
 * burst of the same size. Used per socket, so it is garbage-collected with it.
 *
 * @param {() => number} ratePerSecond - Returns the current limit.
 * @param {() => number} [now] - Clock (for tests).
 * @returns {() => boolean} Returns true when the event is allowed.
 */
function createTokenBucket(ratePerSecond, now = Date.now) {
	let tokens = null;
	let last = now();
	return () => {
		const rate = Math.max(1, ratePerSecond());
		const current = now();
		if (tokens === null) tokens = rate;
		tokens = Math.min(rate, tokens + ((current - last) / 1000) * rate);
		last = current;
		if (tokens < 1) return false;
		tokens -= 1;
		return true;
	};
}

/**
 * Tracks failed handshakes per client IP in a sliding window to slow down
 * token guessing. Only failed authentication attempts count.
 *
 * @param {{ maxFailures?: number, windowMs?: number }} [options] - Limits.
 * @returns {{ isBlocked: (ip: string) => boolean, fail: (ip: string) => boolean, clear: (ip: string) => void, has: (ip: string) => boolean, size: () => number }} Limiter.
 */
function createFailureLimiter({ maxFailures = 20, windowMs = 60_000 } = {}) {
	const entries = new Map();
	const live = (entry, now) => entry && now - entry.firstAt <= windowMs;
	return {
		isBlocked(ip) {
			const entry = entries.get(ip);
			return Boolean(live(entry, Date.now()) && entry.count >= maxFailures);
		},
		fail(ip) {
			const now = Date.now();
			let entry = entries.get(ip);
			if (!live(entry, now)) entry = { count: 0, firstAt: now };
			entry.count += 1;
			entries.set(ip, entry);
			if (entries.size > 10_000) {
				for (const [key, value] of entries) if (!live(value, now)) entries.delete(key);
			}
			return entry.count >= maxFailures;
		},
		clear(ip) {
			entries.delete(ip);
		},
		has(ip) {
			return entries.has(ip);
		},
		size() {
			return entries.size;
		},
	};
}

/**
 * Failed-handshake lockout shared by every process through the cluster
 * store (`plugin_io_counters`, keys are SHA-256 hashes of the IP).
 *
 * - `isBlocked()` is synchronous and reads only local state, so a successful
 *   handshake never queries the database.
 * - `fail()` increments the shared counter in one atomic UPDATE. When the
 *   cluster-wide count reaches the limit, this process blocks the IP locally
 *   until the window ends. Another process learns about the block at its
 *   next failure from that IP, so the effective limit is `maxFailures` plus
 *   at most one attempt per other process.
 * - Without coordination, or when the database call fails, it behaves like
 *   `createFailureLimiter` (per process).
 *
 * @param {object} options - Options.
 * @param {() => { hit: Function, clearCounter: Function } | null} options.store - Shared store, or null for local only.
 * @param {(ip: string) => string} [options.key] - Counter key for an IP.
 * @param {number} [options.maxFailures] - Failures per window.
 * @param {number} [options.windowMs] - Window length.
 * @returns {{ isBlocked: (ip: string) => boolean, fail: (ip: string) => Promise<boolean>, clear: (ip: string) => void, size: () => number }} Limiter.
 */
function createSharedFailureLimiter({ store, key = (ip) => ip, maxFailures = 20, windowMs = 60_000 }) {
	const local = createFailureLimiter({ maxFailures, windowMs });
	/** @type {Map<string, number>} Blocks learned from the shared counter (ip -> until). */
	const blocked = new Map();
	return {
		isBlocked(ip) {
			const until = blocked.get(ip);
			if (until && until > Date.now()) return true;
			if (until) blocked.delete(ip);
			return local.isBlocked(ip);
		},
		async fail(ip) {
			const localBlocked = local.fail(ip);
			const shared = store();
			if (!shared) return localBlocked;
			try {
				const { hits, windowStart } = await shared.hit(key(ip), windowMs);
				if (hits >= maxFailures) {
					blocked.set(ip, windowStart + windowMs);
					if (blocked.size > 10_000) {
						const now = Date.now();
						for (const [k, v] of blocked) if (v <= now) blocked.delete(k);
					}
					return true;
				}
			} catch {
				// Database unavailable: the local count still applies.
			}
			return localBlocked;
		},
		clear(ip) {
			const hadFailures = local.has(ip) || blocked.has(ip);
			local.clear(ip);
			blocked.delete(ip);
			const shared = store();
			if (shared && hadFailures) shared.clearCounter(key(ip)).catch(() => {});
		},
		size() {
			return local.size();
		},
	};
}

export { createFailureLimiter, createSharedFailureLimiter, createTokenBucket };
