import { Avatar, Box, Flex, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useAuth } from '@strapi/strapi/admin';
import { Link, useNavigate } from 'react-router-dom';
import { useOnlineUsers } from '../../hooks/useMonitoringData';
import { useT } from '../../hooks/useT';
import { contentManagerPath, displayName, initials } from '../../utils/content-manager.mjs';
import { RelativeTime } from '../ui';
import { WidgetError, WidgetLoading, WidgetNoData } from './WidgetStates';

const MAX_ROWS = 6;

/**
 * Homepage widget "Admins online": other admins with the Content Manager open.
 * Mirrors the native "Last edited entries" widget (`@strapi/content-manager`
 * RecentDocumentsTable): a borderless table whose rows open the entry, with
 * the name, the content type, a relative time and a ghost edit button.
 *
 * @returns {JSX.Element} Widget body.
 */
const OnlineEditorsWidget = () => {
	const t = useT();
	const navigate = useNavigate();
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

	const rows = others.slice(0, MAX_ROWS);
	return (
		<Table colCount={4} rowCount={rows.length}>
			<Tbody>
				{rows.map((admin) => {
					const entry = admin.editing[0];
					const name = displayName(admin) || t('common.unnamed', 'Unnamed admin');
					const to = entry ? contentManagerPath(entry) : null;
					return (
						<Tr key={admin.id} onClick={to ? () => navigate(to) : undefined} cursor={to ? 'pointer' : undefined}>
							<Td>
								<Flex gap={2} minWidth={0}>
									<Avatar.Item fallback={initials(admin)} delayMs={0} />
									<Typography variant="omega" textColor="neutral800" ellipsis title={name}>
										{name}
									</Typography>
								</Flex>
							</Td>
							<Td>
								<Typography variant="omega" textColor="neutral600" ellipsis>
									{entry ? entry.contentTypeName : t('widget.online.notEditing', 'Not editing')}
								</Typography>
							</Td>
							<Td>
								<Typography textColor="neutral600">
									<RelativeTime value={admin.connectedAt} />
								</Typography>
							</Td>
							<Td onClick={(event) => event.stopPropagation()}>
								{to ? (
									<Box display="inline-block">
										<IconButton
											tag={Link}
											to={to}
											label={t('widget.online.open', 'Open the entry {name} is editing', { name })}
											variant="ghost"
										>
											<Pencil />
										</IconButton>
									</Box>
								) : null}
							</Td>
						</Tr>
					);
				})}
			</Tbody>
		</Table>
	);
};

export { OnlineEditorsWidget };
export default OnlineEditorsWidget;
