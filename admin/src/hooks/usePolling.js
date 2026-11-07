import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data now and every `intervalMs` while the tab is visible. Keeps the
 * last data when a refresh fails and reports the failure separately.
 *
 * @param {() => Promise<any>} load - Loader.
 * @param {number} intervalMs - Refresh interval.
 * @param {boolean} [enabled] - Set false to skip loading (e.g. without permission).
 * @returns {{ data: any, status: 'loading'|'ready'|'error', refreshError: boolean, refresh: () => Promise<void> }} State.
 */
export function usePolling(load, intervalMs, enabled = true) {
	const [data, setData] = useState(null);
	const [status, setStatus] = useState('loading');
	const [refreshError, setRefreshError] = useState(false);
	const loadRef = useRef(load);
	useEffect(() => {
		loadRef.current = load;
	}, [load]);
	const hasData = useRef(false);

	const refresh = useCallback(async () => {
		try {
			const next = await loadRef.current();
			hasData.current = true;
			setData(next);
			setStatus('ready');
			setRefreshError(false);
		} catch {
			if (hasData.current) setRefreshError(true);
			else setStatus('error');
		}
	}, []);

	useEffect(() => {
		if (!enabled) return undefined;
		refresh();
		let timer = null;
		const start = () => {
			if (timer || document.visibilityState === 'hidden') return;
			timer = setInterval(refresh, intervalMs);
		};
		const stop = () => {
			clearInterval(timer);
			timer = null;
		};
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') stop();
			else {
				refresh();
				start();
			}
		};
		start();
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			stop();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [refresh, intervalMs, enabled]);

	return { data, status, refreshError, refresh };
}
