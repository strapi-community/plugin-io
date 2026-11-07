import { useEffect, useRef, useState } from 'react';
import { useFetchClient, useForm } from '@strapi/strapi/admin';
import { io } from 'socket.io-client';

const HEARTBEAT_MS = 30000;
const TYPING_THROTTLE_MS = 2000;
const TYPING_VISIBLE_MS = 4000;

/**
 * Resolves the Strapi server URL the admin talks to.
 *
 * @returns {string} Absolute base URL.
 */
const backendUrl = () => window.strapi?.backendURL || window.location.origin;

/**
 * Connects the edit view to live presence for one document.
 *
 * Every (re)connect asks the server for a fresh one-time session token via
 * the socket.io-client `auth` callback, so reconnects after a network drop or
 * server restart work. Heartbeats pause while the tab is hidden.
 *
 * @param {{ uid?: string, documentId?: string }} target - Document; nothing happens without both.
 * @returns {{ status: 'idle'|'connecting'|'connected'|'disconnected'|'disabled', editors: Array<object>, typing: Record<string, string>, showTyping: boolean }} State.
 */
export function usePresence({ uid, documentId }) {
	const { post } = useFetchClient();
	const [state, setState] = useState({ status: 'idle', editors: [], typing: {}, showTyping: true });
	const socketRef = useRef(null);
	const values = useForm('LivePresencePanel', (s) => s.values, false);
	const lastValues = useRef(values);
	const lastTypingAt = useRef(0);

	useEffect(() => {
		if (!uid || !documentId) return undefined;
		let cancelled = false;
		const typingTimers = new Map();
		let heartbeat = null;

		const fetchSession = async () => (await post('/io/presence/session')).data.data;

		(async () => {
			setState((prev) => ({ ...prev, status: 'connecting' }));
			let session;
			try {
				session = await fetchSession();
			} catch {
				if (!cancelled) setState((prev) => ({ ...prev, status: 'disconnected' }));
				return;
			}
			if (cancelled) return;
			if (!session.enabled) {
				setState((prev) => ({ ...prev, status: 'disabled' }));
				return;
			}
			let firstToken = session.token;
			const socket = io(backendUrl(), {
				path: session.wsPath,
				transports: ['websocket'],
				auth: (cb) => {
					if (firstToken) {
						const token = firstToken;
						firstToken = null;
						cb({ strategy: 'admin-jwt', token });
						return;
					}
					fetchSession()
						.then((next) => cb({ strategy: 'admin-jwt', token: next.token }))
						.catch(() => cb({}));
				},
			});
			socketRef.current = socket;

			socket.on('connect', () => {
				setState((prev) => ({ ...prev, status: 'connected', showTyping: session.showTypingIndicator }));
				socket.emit('presence:join', { uid, documentId }, (response) => {
					if (response?.success) setState((prev) => ({ ...prev, editors: response.editors || [] }));
				});
			});
			socket.on('disconnect', () => setState((prev) => ({ ...prev, status: 'disconnected' })));
			socket.on('connect_error', () => setState((prev) => ({ ...prev, status: 'disconnected' })));
			socket.on('presence:update', (payload) => {
				if (payload?.uid === uid && payload?.documentId === documentId) {
					setState((prev) => ({ ...prev, editors: payload.editors || [] }));
				}
			});
			socket.on('presence:typing', (payload) => {
				if (payload?.uid !== uid || payload?.documentId !== documentId || !payload.user?.id) return;
				const key = String(payload.user.id);
				clearTimeout(typingTimers.get(key));
				setState((prev) => ({ ...prev, typing: { ...prev.typing, [key]: payload.fieldName } }));
				typingTimers.set(
					key,
					setTimeout(() => {
						setState((prev) => {
							const typing = { ...prev.typing };
							delete typing[key];
							return { ...prev, typing };
						});
					}, TYPING_VISIBLE_MS)
				);
			});

			heartbeat = setInterval(() => {
				if (document.visibilityState === 'visible' && socket.connected) socket.emit('presence:heartbeat');
			}, HEARTBEAT_MS);
		})();

		return () => {
			cancelled = true;
			clearInterval(heartbeat);
			for (const timer of typingTimers.values()) clearTimeout(timer);
			const socket = socketRef.current;
			if (socket) {
				socket.emit('presence:leave', { uid, documentId });
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [uid, documentId, post]);

	useEffect(() => {
		const previous = lastValues.current;
		lastValues.current = values;
		const socket = socketRef.current;
		if (!socket?.connected || !values || !previous || previous === values) return;
		const now = Date.now();
		if (now - lastTypingAt.current < TYPING_THROTTLE_MS) return;
		const changed = Object.keys(values).find((key) => values[key] !== previous[key]);
		if (!changed) return;
		lastTypingAt.current = now;
		socket.emit('presence:typing', { uid, documentId, fieldName: changed });
	}, [values, uid, documentId]);

	return state;
}
