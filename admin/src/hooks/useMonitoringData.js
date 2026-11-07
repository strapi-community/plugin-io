import { useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { usePolling } from './usePolling';

/**
 * Polls `GET /io/stats` (response `{ data: { connections, events, instances } }`, summed over every server process).
 *
 * @param {number} [intervalMs] - Refresh interval.
 * @param {boolean} [enabled] - Skip loading when false.
 * @returns {ReturnType<typeof usePolling>} Stats state; `data` is the inner object.
 */
export function useSocketStats(intervalMs = 10000, enabled = true) {
	const { get } = useFetchClient();
	const load = useCallback(async () => (await get('/io/stats')).data.data, [get]);
	return usePolling(load, intervalMs, enabled);
}

/**
 * Polls `GET /io/online-users` (response `{ data: { admins, counts }, meta: { scope } }`).
 *
 * @param {number} [intervalMs] - Refresh interval.
 * @param {boolean} [enabled] - Skip loading when false.
 * @returns {ReturnType<typeof usePolling>} State; `data` is the inner object plus `meta`.
 */
export function useOnlineUsers(intervalMs = 15000, enabled = true) {
	const { get } = useFetchClient();
	const load = useCallback(async () => {
		const { data } = await get('/io/online-users');
		return { ...data.data, meta: data.meta };
	}, [get]);
	return usePolling(load, intervalMs, enabled);
}
