/**
 * Per-socket data that must stay on the process that owns the socket.
 *
 * `socket.data` is serialised and sent to other servers by `fetchSockets()`
 * once a multi-server adapter is attached
 * (https://socket.io/docs/v4/server-instance/#fetchsockets). The admin's
 * CASL ability (large) and the client IP (personal data) are therefore kept
 * here instead, in a WeakMap that is released with the socket.
 */
const store = new WeakMap();

/**
 * Reads a private value of a socket.
 *
 * @param {object} socket - Local socket.
 * @param {'adminAbility' | 'clientIp'} key - Key.
 * @returns {any} Value, or undefined.
 */
function getPrivate(socket, key) {
	return store.get(socket)?.[key];
}

/**
 * Sets a private value of a socket.
 *
 * @param {object} socket - Local socket.
 * @param {'adminAbility' | 'clientIp'} key - Key.
 * @param {any} value - Value.
 */
function setPrivate(socket, key, value) {
	if (!socket || typeof socket !== 'object') return;
	const entry = store.get(socket) ?? {};
	entry[key] = value;
	store.set(socket, entry);
}

export { getPrivate, setPrivate };
