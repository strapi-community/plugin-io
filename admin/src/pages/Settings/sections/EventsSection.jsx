import {
	Badge,
	Button,
	Checkbox,
	EmptyStateLayout,
	Flex,
	Grid,
	Loader,
	Table,
	Tbody,
	Td,
	Th,
	Thead,
	Tr,
	Typography,
	VisuallyHidden,
} from '@strapi/design-system';
import { BooleanField, SectionCard, TagListField } from '../../../components/ui';
import { CONTENT_ACTIONS, DRAFT_ACTIONS } from '../../../utils/settings.mjs';

/**
 * Content event settings: draft handling, excluded fields and the actions
 * that emit events per content type.
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const EventsSection = ({ draft, setField, errorFor, disabled, t, contentTypes, reloadContentTypes }) => {
	const actionLabels = {
		create: t('settings.events.action.create', 'Create'),
		update: t('settings.events.action.update', 'Update'),
		delete: t('settings.events.action.delete', 'Delete'),
		publish: t('settings.events.action.publish', 'Publish'),
		unpublish: t('settings.events.action.unpublish', 'Unpublish'),
		discardDraft: t('settings.events.action.discardDraft', 'Discard draft'),
	};
	const selected = draft.events.contentTypes || {};

	const toggle = (uid, action, checked) => {
		const current = new Set(selected[uid] || []);
		if (checked) current.add(action);
		else current.delete(action);
		const next = { ...selected };
		if (current.size) next[uid] = CONTENT_ACTIONS.filter((a) => current.has(a));
		else delete next[uid];
		setField('events.contentTypes', next);
	};

	let table;
	if (contentTypes.status === 'loading') {
		table = (
			<Flex justifyContent="center" padding={6}>
				<Loader small>{t('settings.events.contentTypes.loading', 'Loading content types')}</Loader>
			</Flex>
		);
	} else if (contentTypes.status === 'error') {
		table = (
			<EmptyStateLayout
				content={t('settings.events.contentTypes.error', 'Content types could not be loaded.')}
				action={
					<Button variant="secondary" onClick={reloadContentTypes}>
						{t('common.retry', 'Try again')}
					</Button>
				}
			/>
		);
	} else if (!contentTypes.data.length) {
		table = (
			<EmptyStateLayout
				content={t(
					'settings.events.contentTypes.empty',
					'No content types yet. Create one in the Content-Type Builder, then choose its events here.'
				)}
			/>
		);
	} else {
		table = (
			<Table colCount={CONTENT_ACTIONS.length + 1} rowCount={contentTypes.data.length + 1}>
				<Thead>
					<Tr>
						<Th>
							<Typography variant="sigma">{t('settings.events.contentTypes.column', 'Content type')}</Typography>
						</Th>
						{CONTENT_ACTIONS.map((action) => (
							<Th key={action}>
								<Typography variant="sigma">{actionLabels[action]}</Typography>
							</Th>
						))}
					</Tr>
				</Thead>
				<Tbody>
					{contentTypes.data.map((ct) => {
						const fixed = ct.configActions;
						const active = new Set(fixed ?? selected[ct.uid] ?? []);
						return (
							<Tr key={ct.uid}>
								<Td>
									<Flex gap={2} wrap="wrap">
										<Typography textColor="neutral800" fontWeight="semiBold">
											{ct.displayName}
										</Typography>
										{fixed ? <Badge>{t('settings.events.contentTypes.fromConfig', 'Set in config')}</Badge> : null}
									</Flex>
								</Td>
								{CONTENT_ACTIONS.map((action) => {
									const unsupported = DRAFT_ACTIONS.includes(action) && !ct.draftAndPublish;
									return (
										<Td key={action}>
											{unsupported ? (
												<>
													<Typography textColor="neutral600" aria-hidden>
														—
													</Typography>
													<VisuallyHidden>
														{t('settings.events.contentTypes.notAvailable', 'Not available without Draft & Publish')}
													</VisuallyHidden>
												</>
											) : (
												<Checkbox
													aria-label={t('settings.events.contentTypes.checkbox', '{action} events for {contentType}', {
														action: actionLabels[action],
														contentType: ct.displayName,
													})}
													checked={active.has(action)}
													disabled={disabled || Boolean(fixed)}
													onCheckedChange={(checked) => toggle(ct.uid, action, checked === true)}
												/>
											)}
										</Td>
									);
								})}
							</Tr>
						);
					})}
				</Tbody>
			</Table>
		);
	}

	return (
		<SectionCard
			title={t('settings.events.title', 'Content events')}
			subtitle={t(
				'settings.events.subtitle',
				'Choose which changes are sent to clients. Each role and API token only receives content it may read (find or findOne permission).'
			)}
		>
			<Grid.Root gap={6}>
				<Grid.Item col={12} direction="column" alignItems="stretch">
					<BooleanField
						name="events.onlyPublished"
						label={t('settings.events.onlyPublished.label', 'Only published content')}
						hint={t(
							'settings.events.onlyPublished.hint',
							'Do not send draft versions of Draft & Publish content. Turn off to send drafts to roles that may read them.'
						)}
						checked={draft.events.onlyPublished}
						onCheckedChange={(value) => setField('events.onlyPublished', value)}
						disabled={disabled}
					/>
				</Grid.Item>
				<Grid.Item col={12} direction="column" alignItems="stretch">
					<TagListField
						name="events.excludeFields"
						kind="field"
						label={t('settings.events.excludeFields.label', 'Excluded fields')}
						hint={t(
							'settings.events.excludeFields.hint',
							'Field names removed from every event, in addition to private fields and built-in secrets.'
						)}
						placeholder="internalNotes"
						error={errorFor('events.excludeFields')}
						value={draft.events.excludeFields}
						onChange={(value) => setField('events.excludeFields', value)}
						disabled={disabled}
					/>
				</Grid.Item>
			</Grid.Root>
			{table}
		</SectionCard>
	);
};
