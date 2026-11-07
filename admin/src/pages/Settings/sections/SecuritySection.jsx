import { Grid } from '@strapi/design-system';
import { BooleanField, NumberField, SectionCard, TagListField } from '../../../components/ui';

/**
 * Security settings: required authentication, IP rules and the event rate
 * limit. One grid, like the native Advanced settings form: booleans span
 * the full row, paired inputs share it.
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const SecuritySection = ({ draft, setField, errorFor, disabled, t }) => (
	<SectionCard
		title={t('settings.security.title', 'Security')}
		subtitle={t('settings.security.subtitle', 'These rules apply to every new connection.')}
	>
		<Grid.Root gap={6}>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="security.requireAuthentication"
					label={t('settings.security.requireAuth.label', 'Require authentication')}
					hint={t(
						'settings.security.requireAuth.hint',
						'Reject clients that connect without a user JWT or API token. When off, they join the Public role.'
					)}
					checked={draft.security.requireAuthentication}
					onCheckedChange={(value) => setField('security.requireAuthentication', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
				<TagListField
					name="security.ipWhitelist"
					kind="ip"
					label={t('settings.security.allowlist.label', 'Allowed IP addresses')}
					hint={t('settings.security.allowlist.hint', 'Leave empty to allow all addresses that are not blocked.')}
					placeholder="203.0.113.0/24"
					error={errorFor('security.ipWhitelist')}
					value={draft.security.ipWhitelist}
					onChange={(value) => setField('security.ipWhitelist', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
				<TagListField
					name="security.ipBlacklist"
					kind="ip"
					label={t('settings.security.blocklist.label', 'Blocked IP addresses')}
					hint={t(
						'settings.security.blocklist.hint',
						'Blocked addresses win over allowed ones. Uses the client IP from your proxy settings.'
					)}
					placeholder="198.51.100.7"
					error={errorFor('security.ipBlacklist')}
					value={draft.security.ipBlacklist}
					onChange={(value) => setField('security.ipBlacklist', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="security.rateLimiting.enabled"
					label={t('settings.security.rateLimit.label', 'Limit client events')}
					hint={t('settings.security.rateLimit.hint', 'Drop events a single client sends faster than the limit below.')}
					checked={draft.security.rateLimiting.enabled}
					onCheckedChange={(value) => setField('security.rateLimiting.enabled', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
				<NumberField
					name="security.rateLimiting.maxEventsPerSecond"
					label={t('settings.security.maxEvents.label', 'Events per second per client')}
					hint={
						draft.security.rateLimiting.enabled
							? t('settings.security.maxEvents.hint', 'Allowed: 1 to 1,000.')
							: t('settings.security.maxEvents.disabledHint', 'Requires "Limit client events".')
					}
					error={errorFor('security.rateLimiting.maxEventsPerSecond')}
					value={draft.security.rateLimiting.maxEventsPerSecond}
					onChange={(value) => setField('security.rateLimiting.maxEventsPerSecond', value)}
					disabled={disabled || !draft.security.rateLimiting.enabled}
				/>
			</Grid.Item>
		</Grid.Root>
	</SectionCard>
);
