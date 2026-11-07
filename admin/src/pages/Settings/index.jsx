import { useEffect } from 'react';
import { Button, Flex } from '@strapi/design-system';
import { ArrowClockwise, Check } from '@strapi/icons';
import { Blocker, Form, Page, useForm, useRBAC } from '@strapi/strapi/admin';
import { ConfirmAction, PageShell } from '../../components/ui';
import { useT } from '../../hooks/useT';
import { PERMISSIONS } from '../../permissions';
import { LIMITS } from '../../utils/settings.mjs';
import { BackupSection } from './sections/BackupSection';
import { ConnectionSection } from './sections/ConnectionSection';
import { EventsSection } from './sections/EventsSection';
import { MonitoringSection, PresenceSection } from './sections/PresenceMonitoringSection';
import { RolesSection } from './sections/RolesSection';
import { SecuritySection } from './sections/SecuritySection';
import { SubscriptionsSection } from './sections/SubscriptionsSection';
import { useSettingsForm } from './useSettingsForm';

const RBAC = [...PERMISSIONS.settings.read, ...PERMISSIONS.settings.update];

/** Mirrors the draft into Strapi's Form so the native Blocker sees unsaved changes. */
const DraftSync = ({ values }) => {
	const setValues = useForm('DraftSync', (state) => state.setValues);
	useEffect(() => {
		setValues(values);
	}, [values, setValues]);
	return null;
};

const RANGE_BY_PATH = {
	'connection.maxConnections': LIMITS.maxConnections,
	'connection.pingInterval': LIMITS.ms,
	'connection.pingTimeout': LIMITS.ms,
	'connection.connectionTimeout': LIMITS.ms,
	'security.rateLimiting.maxEventsPerSecond': LIMITS.maxEventsPerSecond,
	'monitoring.maxEventLogSize': LIMITS.maxEventLogSize,
	'subscriptions.maxPerSocket': LIMITS.maxPerSocket,
};

/**
 * Settings > Socket.IO > Settings. Native settings anatomy: Save in the
 * header, sections as cards, inline validation, unsaved-changes guard.
 *
 * @returns {JSX.Element} Page.
 */
const SettingsPage = () => {
	const t = useT();
	const { allowedActions, isLoading: rbacLoading } = useRBAC(RBAC);
	const form = useSettingsForm();

	if (rbacLoading) return <Page.Loading />;
	if (!allowedActions.canRead) return <Page.NoPermissions />;
	if (form.status === 'loading' && !form.draft) return <Page.Loading />;
	if (form.status === 'error') {
		return (
			<Page.Error
				content={t('settings.load.error', 'Settings could not be loaded. Nothing can be saved until they load.')}
				action={
					<Button variant="secondary" startIcon={<ArrowClockwise />} onClick={form.reload}>
						{t('common.retry', 'Try again')}
					</Button>
				}
			/>
		);
	}

	const canUpdate = allowedActions.canUpdate;
	const errorFor = (path) => {
		if (form.serverErrors[path]) return form.serverErrors[path];
		if (form.errors[path] === 'range') {
			const { min, max } = RANGE_BY_PATH[path];
			return t('settings.error.range', 'Enter a whole number from {min} to {max}.', { min, max });
		}
		return undefined;
	};
	const sectionProps = { draft: form.draft, setField: form.setField, errorFor, disabled: !canUpdate, t };
	const hasErrors = Object.keys(form.errors).length > 0;

	return (
		<PageShell
			pageTitle={t('settings.pageTitle', 'Settings - Socket.IO')}
			title={t('settings.title', 'Socket.IO')}
			subtitle={t('settings.subtitle', 'Configure real-time connections, content events and live presence.')}
			busy={form.saving}
			primaryAction={
				<Flex gap={2}>
					<ConfirmAction
						size="S"
						label={t('settings.discard', 'Discard changes')}
						triggerVariant="tertiary"
						title={t('settings.discard.title', 'Discard changes?')}
						body={t('settings.discard.body', 'Your unsaved changes are lost and the saved settings are loaded again.')}
						confirmLabel={t('settings.discard.confirm', 'Discard changes')}
						variant="danger-light"
						disabled={!form.dirty || form.saving}
						onConfirm={form.discard}
						getFallbackFocus={() => document.querySelector('main h1')}
					/>
					<Button
						size="S"
						startIcon={<Check />}
						onClick={form.save}
						loading={form.saving}
						disabled={!canUpdate || !form.dirty || hasErrors}
					>
						{t('settings.save', 'Save')}
					</Button>
				</Flex>
			}
		>
			<ConnectionSection {...sectionProps} />
			<SecuritySection {...sectionProps} />
			<EventsSection {...sectionProps} contentTypes={form.contentTypes} reloadContentTypes={form.reloadContentTypes} />
			<SubscriptionsSection {...sectionProps} />
			<RolesSection {...sectionProps} roles={form.roles} reloadRoles={form.reloadRoles} />
			<PresenceSection {...sectionProps} />
			<MonitoringSection {...sectionProps} />
			<BackupSection
				saved={form.saved}
				draft={form.draft}
				onApply={form.replaceDraft}
				canUpdate={canUpdate}
				busy={form.saving}
				t={t}
			/>
			{/* Kept empty: DS Tag buttons have no type and would submit a real form on Enter. */}
			<Form method="PUT" initialValues={form.saved}>
				<DraftSync values={form.draft} />
				<Blocker />
			</Form>
		</PageShell>
	);
};

export { SettingsPage };
export default SettingsPage;
