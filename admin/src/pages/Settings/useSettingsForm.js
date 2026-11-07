import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { getTranslation } from '../../utils/getTranslation';
import { changedSections, isEqual, serverErrorsToFields, setIn, validateSettings } from '../../utils/settings.mjs';

/**
 * Loads, edits, validates and saves the plugin settings. Content types and
 * roles load separately, so a failure there does not hide the form.
 *
 * @returns {object} Form state and actions.
 */
export function useSettingsForm() {
	const { get, put } = useFetchClient();
	const { toggleNotification } = useNotification();
	const { formatMessage } = useIntl();

	const [status, setStatus] = useState('loading');
	const [saved, setSaved] = useState(null);
	const [draft, setDraft] = useState(null);
	const [serverErrors, setServerErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [contentTypes, setContentTypes] = useState({ status: 'loading', data: [] });
	const [roles, setRoles] = useState({ status: 'loading', data: [] });

	const fetchSettings = useCallback(async () => {
		try {
			const { data } = await get('/io/settings');
			setSaved(data.data);
			setDraft(data.data);
			setServerErrors({});
			setStatus('ready');
		} catch {
			setStatus('error');
		}
	}, [get]);

	const fetchContentTypes = useCallback(async () => {
		try {
			const { data } = await get('/io/content-types');
			setContentTypes({ status: 'ready', data: data.data });
		} catch {
			setContentTypes({ status: 'error', data: [] });
		}
	}, [get]);

	const fetchRoles = useCallback(async () => {
		try {
			const { data } = await get('/io/roles');
			setRoles({ status: 'ready', data: data.data });
		} catch {
			setRoles({ status: 'error', data: [] });
		}
	}, [get]);

	useEffect(() => {
		let active = true;
		const guard = (fn) => () => active && fn();
		// Each loader only sets state after its request settles.
		Promise.resolve().then(guard(fetchSettings));
		Promise.resolve().then(guard(fetchContentTypes));
		Promise.resolve().then(guard(fetchRoles));
		return () => {
			active = false;
		};
	}, [fetchSettings, fetchContentTypes, fetchRoles]);

	const loadSettings = useCallback(async () => {
		setStatus('loading');
		await fetchSettings();
	}, [fetchSettings]);
	const loadContentTypes = useCallback(async () => {
		setContentTypes((prev) => ({ ...prev, status: 'loading' }));
		await fetchContentTypes();
	}, [fetchContentTypes]);
	const loadRoles = useCallback(async () => {
		setRoles((prev) => ({ ...prev, status: 'loading' }));
		await fetchRoles();
	}, [fetchRoles]);

	const errors = useMemo(() => (draft ? validateSettings(draft) : {}), [draft]);
	const dirty = Boolean(saved && draft && !isEqual(saved, draft));

	const setField = useCallback((path, value) => {
		setDraft((prev) => setIn(prev, path, value));
		setServerErrors((prev) => {
			if (!(path in prev)) return prev;
			const next = { ...prev };
			delete next[path];
			return next;
		});
	}, []);

	const replaceDraft = useCallback((values) => {
		setDraft(values);
		setServerErrors({});
	}, []);

	const save = useCallback(async () => {
		if (Object.keys(errors).length) return;
		setSaving(true);
		try {
			const { data } = await put('/io/settings', draft);
			const stored = data.data;
			const adjusted = changedSections(draft, stored);
			setSaved(stored);
			setDraft(stored);
			setServerErrors({});
			toggleNotification({
				type: 'success',
				message: adjusted.length
					? formatMessage(
							{ id: getTranslation('settings.save.adjusted'), defaultMessage: 'Settings saved. Adjusted: {sections}.' },
							{ sections: adjusted.join(', ') }
						)
					: formatMessage({ id: getTranslation('settings.save.success'), defaultMessage: 'Settings saved.' }),
			});
		} catch (error) {
			setServerErrors(serverErrorsToFields(error));
			toggleNotification({
				type: 'danger',
				message: formatMessage({
					id: getTranslation('settings.save.error'),
					defaultMessage: 'Settings could not be saved. Your changes are still in the form.',
				}),
			});
		} finally {
			setSaving(false);
		}
	}, [draft, errors, put, toggleNotification, formatMessage]);

	const discard = useCallback(async () => {
		await loadSettings();
	}, [loadSettings]);

	return {
		status,
		saved,
		draft,
		errors,
		serverErrors,
		dirty,
		saving,
		contentTypes,
		roles,
		setField,
		replaceDraft,
		save,
		discard,
		reload: loadSettings,
		reloadContentTypes: loadContentTypes,
		reloadRoles: loadRoles,
	};
}
