import { Grid } from '@strapi/design-system';
import { BooleanField, NumberField, SectionCard } from '../../../components/ui';

/**
 * Live presence settings for the Content Manager.
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const PresenceSection = ({ draft, setField, disabled, t }) => (
	<SectionCard
		title={t('settings.presence.title', 'Live presence')}
		subtitle={t('settings.presence.subtitle', 'Show admins who else is editing the same entry in the Content Manager.')}
	>
		<Grid.Root gap={6}>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="presence.enabled"
					label={t('settings.presence.enabled.label', 'Show who is editing')}
					hint={t('settings.presence.enabled.hint', 'Adds a Live presence panel to the edit view.')}
					checked={draft.presence.enabled}
					onCheckedChange={(value) => setField('presence.enabled', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="presence.showTypingIndicator"
					label={t('settings.presence.typing.label', 'Show typing')}
					hint={t('settings.presence.typing.hint', 'Show which field another admin is typing in.')}
					checked={draft.presence.showTypingIndicator}
					onCheckedChange={(value) => setField('presence.showTypingIndicator', value)}
					disabled={disabled || !draft.presence.enabled}
				/>
			</Grid.Item>
		</Grid.Root>
	</SectionCard>
);

/**
 * Monitoring settings: connection logging and the in-memory event log.
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const MonitoringSection = ({ draft, setField, errorFor, disabled, t }) => (
	<SectionCard
		title={t('settings.monitoring.title', 'Monitoring')}
		subtitle={t('settings.monitoring.subtitle', 'Logs never contain IP addresses, emails or tokens.')}
	>
		<Grid.Root gap={6}>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="monitoring.enableConnectionLogging"
					label={t('settings.monitoring.connectionLogging.label', 'Log connections')}
					hint={t(
						'settings.monitoring.connectionLogging.hint',
						'Write a server log line when a client connects or disconnects.'
					)}
					checked={draft.monitoring.enableConnectionLogging}
					onCheckedChange={(value) => setField('monitoring.enableConnectionLogging', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="monitoring.enableEventLogging"
					label={t('settings.monitoring.eventLogging.label', 'Keep an event log')}
					hint={t(
						'settings.monitoring.eventLogging.hint',
						'Show recent events on the Monitoring page. Kept in memory only.'
					)}
					checked={draft.monitoring.enableEventLogging}
					onCheckedChange={(value) => setField('monitoring.enableEventLogging', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
				<NumberField
					name="monitoring.maxEventLogSize"
					label={t('settings.monitoring.maxLogSize.label', 'Event log size')}
					hint={t('settings.monitoring.maxLogSize.hint', 'Number of events kept. Allowed: 10 to 1,000.')}
					error={errorFor('monitoring.maxEventLogSize')}
					value={draft.monitoring.maxEventLogSize}
					onChange={(value) => setField('monitoring.maxEventLogSize', value)}
					disabled={disabled}
				/>
			</Grid.Item>
		</Grid.Root>
	</SectionCard>
);
