import { Grid } from '@strapi/design-system';
import { BooleanField, NumberField, SectionCard } from '../../../components/ui';

/**
 * Entity subscriptions: clients may follow single entries with
 * `subscribe-entity`. Each subscription is checked against the read
 * permission of the client's role or API token.
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const SubscriptionsSection = ({ draft, setField, errorFor, disabled, t }) => (
	<SectionCard
		title={t('settings.subscriptions.title', 'Entry subscriptions')}
		subtitle={t(
			'settings.subscriptions.subtitle',
			'Let clients follow single entries, also of content types that are not broadcast. Clients need read permission for the content type.'
		)}
	>
		<Grid.Root gap={6}>
			<Grid.Item col={12} direction="column" alignItems="stretch">
				<BooleanField
					name="subscriptions.enabled"
					label={t('settings.subscriptions.enabled.label', 'Allow entry subscriptions')}
					hint={t(
						'settings.subscriptions.enabled.hint',
						'Clients send subscribe-entity with a content type and documentId.'
					)}
					checked={draft.subscriptions.enabled}
					onCheckedChange={(value) => setField('subscriptions.enabled', value)}
					disabled={disabled}
				/>
			</Grid.Item>
			<Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
				<NumberField
					name="subscriptions.maxPerSocket"
					label={t('settings.subscriptions.max.label', 'Subscriptions per client')}
					hint={t('settings.subscriptions.max.hint', 'Allowed: 1 to 1,000.')}
					error={errorFor('subscriptions.maxPerSocket')}
					value={draft.subscriptions.maxPerSocket}
					onChange={(value) => setField('subscriptions.maxPerSocket', value)}
					disabled={disabled || !draft.subscriptions.enabled}
				/>
			</Grid.Item>
		</Grid.Root>
	</SectionCard>
);
