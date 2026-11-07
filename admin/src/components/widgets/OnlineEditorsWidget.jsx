import { Avatar, Box, Flex, Link as DSLink, Typography } from '@strapi/design-system';
import { useAuth } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { useOnlineUsers } from '../../hooks/useMonitoringData';
import { useT } from '../../hooks/useT';
import { contentManagerPath, displayName, initials } from '../../utils/content-manager.mjs';
import { WidgetError, WidgetLoading, WidgetNoData } from './WidgetStates';

/**
 * Homepage widget "Admins online": other admins connected through live
 * presence and the entries they are editing.
 *
 * @returns {JSX.Element} Widget body.
 */
const OnlineEditorsWidget = () => {
	const t = useT();
	const me = useAuth('OnlineEditorsWidget', (state) => state.user);
	const online = useOnlineUsers(15000);

	if (online.status === 'loading') return <WidgetLoading label={t('widget.online.loading', 'Loading admins online')} />;
	if (online.status === 'error') {
		return (
			<WidgetError
				label={t('widget.online.error', 'Admins online could not be loaded.')}
				retryLabel={t('common.retry', 'Try again')}
				onRetry={online.refresh}
			/>
		);
	}

	const others = (online.data.admins || []).filter((admin) => String(admin.id) !== String(me?.id));
	if (!others.length)
		return <WidgetNoData label={t('widget.online.empty', 'No other admins are editing right now.')} />;

	return (
		<Flex tag="ul" direction="column" alignItems="stretch" gap={3}>
			{others.slice(0, 6).map((admin) => (
				<Flex tag="li" key={admin.id} gap={3} minWidth={0}>
					<Avatar.Item fallback={initials(admin)} delayMs={0} />
					<Box minWidth={0} flex="1 1 0">
						<Typography tag="p" textColor="neutral800" fontWeight="semiBold" ellipsis>
							{displayName(admin) || t('common.unnamed', 'Unnamed admin')}
						</Typography>
						{admin.editing[0] ? (
							<DSLink tag={Link} to={contentManagerPath(admin.editing[0])}>
								{t('widget.online.editing', 'Editing {contentType}', { contentType: admin.editing[0].contentTypeName })}
							</DSLink>
						) : (
							<Typography variant="pi" textColor="neutral600">
								{t('widget.online.notEditing', 'Not editing')}
							</Typography>
						)}
					</Box>
				</Flex>
			))}
		</Flex>
	);
};

export { OnlineEditorsWidget };
export default OnlineEditorsWidget;
