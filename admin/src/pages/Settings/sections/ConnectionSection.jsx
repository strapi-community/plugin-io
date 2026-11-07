import { Grid } from '@strapi/design-system';
import { NumberField, SectionCard, TagListField } from '../../../components/ui';

/**
 * Connection settings: allowed origins, connection cap, ping and timeouts.
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const ConnectionSection = ({ draft, setField, errorFor, disabled, t }) => {
	const ms = t('settings.unit.ms', 'ms');
	return (
		<SectionCard
			title={t('settings.connection.title', 'Connections')}
			subtitle={t('settings.connection.subtitle', 'Control who can connect and how connections are kept alive.')}
		>
			<TagListField
				name="cors.origins"
				kind="origin"
				label={t('settings.connection.origins.label', 'Allowed origins')}
				hint={t(
					'settings.connection.origins.hint',
					'Frontends that may connect from a browser. Leave empty to allow WebSocket connections from any origin. The Strapi admin is always allowed.'
				)}
				placeholder="https://app.example.com"
				error={errorFor('cors.origins')}
				value={draft.cors.origins}
				onChange={(value) => setField('cors.origins', value)}
				disabled={disabled}
			/>
			<Grid.Root gap={6}>
				<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
					<NumberField
						name="connection.maxConnections"
						label={t('settings.connection.maxConnections.label', 'Maximum connections')}
						hint={t('settings.connection.maxConnections.hint', '0 means unlimited. Allowed: 0 to 100,000.')}
						error={errorFor('connection.maxConnections')}
						value={draft.connection.maxConnections}
						onChange={(value) => setField('connection.maxConnections', value)}
						disabled={disabled}
					/>
				</Grid.Item>
				<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
					<NumberField
						name="connection.connectionTimeout"
						unit={ms}
						label={t('settings.connection.connectionTimeout.label', 'Connection timeout')}
						hint={t(
							'settings.connection.connectionTimeout.hint',
							'Time a client has to finish connecting. Allowed: 1,000 to 600,000.'
						)}
						error={errorFor('connection.connectionTimeout')}
						value={draft.connection.connectionTimeout}
						onChange={(value) => setField('connection.connectionTimeout', value)}
						disabled={disabled}
					/>
				</Grid.Item>
				<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
					<NumberField
						name="connection.pingInterval"
						unit={ms}
						label={t('settings.connection.pingInterval.label', 'Ping interval')}
						hint={t(
							'settings.connection.pingInterval.hint',
							'How often the server checks that a client is still there. Allowed: 1,000 to 600,000.'
						)}
						error={errorFor('connection.pingInterval')}
						value={draft.connection.pingInterval}
						onChange={(value) => setField('connection.pingInterval', value)}
						disabled={disabled}
					/>
				</Grid.Item>
				<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
					<NumberField
						name="connection.pingTimeout"
						unit={ms}
						label={t('settings.connection.pingTimeout.label', 'Ping timeout')}
						hint={t(
							'settings.connection.pingTimeout.hint',
							'How long to wait for an answer before closing the connection. Allowed: 1,000 to 600,000.'
						)}
						error={errorFor('connection.pingTimeout')}
						value={draft.connection.pingTimeout}
						onChange={(value) => setField('connection.pingTimeout', value)}
						disabled={disabled}
					/>
				</Grid.Item>
			</Grid.Root>
		</SectionCard>
	);
};
