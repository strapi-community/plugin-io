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
 * @returns {{ isBlocked: (ip: string) => boolean, fail: (ip: string) => boolean, clear: (ip: string) => void, size: () => number }} Limiter.
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
		size() {
			return entries.size;
		},
	};
}

export { createFailureLimiter, createTokenBucket };
