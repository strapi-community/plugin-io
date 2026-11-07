import { Avatar, Badge, Flex, Status, Typography } from '@strapi/design-system';
import { useAuth } from '@strapi/strapi/admin';
import { useT } from '../hooks/useT';
import { usePresence } from '../hooks/usePresence';
import { displayName, initials } from '../utils/content-manager.mjs';

/**
 * Content Manager edit view side panel "Live presence": shows the other
 * admins editing the same entry. Hidden on the create view, when presence
 * is turned off, and for content types the admin may not read.
 *
 * @param {{ model: string, documentId?: string, document?: { documentId?: string } }} props - Edit view context.
 * @returns {{ title: string, content: JSX.Element } | null} Panel description.
 */
const LivePresencePanel = ({ model, documentId, document }) => {
	const t = useT();
	const me = useAuth('LivePresencePanel', (state) => state.user);
	const id = documentId ?? document?.documentId;
	const presence = usePresence({ uid: model, documentId: id });

	if (!id || presence.status === 'disabled' || presence.status === 'idle') return null;

	const others = presence.editors.filter((editor) => String(editor.id) !== String(me?.id));
	const statusView = {
		connecting: { variant: 'secondary', label: t('presence.status.connecting', 'Connecting') },
		connected: { variant: 'success', label: t('presence.status.connected', 'Live') },
		disconnected: { variant: 'neutral', label: t('presence.status.disconnected', 'Reconnecting') },
	}[presence.status];

	return {
		title: t('presence.title', 'Live presence'),
		content: (
			<Flex direction="column" alignItems="stretch" gap={3} width="100%">
				<Status variant={statusView.variant} size="S">
					<Typography variant="omega" fontWeight="semiBold">
						{statusView.label}
					</Typography>
				</Status>
				{others.length === 0 ? (
					<Typography variant="pi" textColor="neutral600">
						{t('presence.alone', 'Only you are editing this entry.')}
					</Typography>
				) : (
					<Flex
						tag="ul"
						direction="column"
						alignItems="stretch"
						gap={2}
						aria-label={t('presence.editors', 'Also editing')}
					>
						{others.map((editor) => {
							const field = presence.showTyping ? presence.typing[String(editor.id)] : undefined;
							return (
								<Flex tag="li" key={editor.id} gap={2} minWidth={0}>
									<Avatar.Item fallback={initials(editor)} delayMs={0} />
									<Flex direction="column" alignItems="flex-start" minWidth={0}>
										<Typography variant="omega" textColor="neutral800" ellipsis>
											{displayName(editor) || t('common.unnamed', 'Unnamed admin')}
										</Typography>
										{field ? <Badge>{t('presence.typing', 'Typing in {field}', { field })}</Badge> : null}
									</Flex>
								</Flex>
							);
						})}
					</Flex>
				)}
			</Flex>
		),
	};
};

export { LivePresencePanel };
export default LivePresencePanel;
