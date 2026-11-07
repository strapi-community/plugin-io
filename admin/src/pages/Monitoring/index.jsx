import {
	Alert,
	Avatar,
	Badge,
	Box,
	Button,
	EmptyStateLayout,
	Flex,
	LinkButton,
	Table,
	Tbody,
	Td,
	Th,
	Thead,
	Tr,
	Typography,
} from '@strapi/design-system';
import { ArrowClockwise, Trash } from '@strapi/icons';
import { Page, useFetchClient, useNotification, useRBAC } from '@strapi/strapi/admin';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmAction, PageShell, RelativeTime, SectionCard } from '../../components/ui';
import { useOnlineUsers, useSocketStats } from '../../hooks/useMonitoringData';
import { usePolling } from '../../hooks/usePolling';
import { useT } from '../../hooks/useT';
import { PERMISSIONS } from '../../permissions';
import { contentManagerPath, displayName, initials } from '../../utils/content-manager.mjs';
import { StatCards } from './StatCards';
import { TestEventModal } from './TestEventModal';

const RBAC = [...PERMISSIONS.monitoring.read, ...PERMISSIONS.monitoring.manage];

/**
 * Settings > Socket.IO > Monitoring: live counters, admins online and the
 * event log. No IP addresses, emails or socket ids are shown.
 *
 * @returns {JSX.Element} Page.
 */
const MonitoringPage = () => {
	const t = useT();
	const { get, post } = useFetchClient();
	const { toggleNotification } = useNotification();
	const { allowedActions, isLoading: rbacLoading } = useRBAC(RBAC);
	const canRead = !rbacLoading && allowedActions.canRead;
	const stats = useSocketStats(10000, canRead);
	const online = useOnlineUsers(15000, canRead);
	const loadLog = useCallback(async () => (await get('/io/event-log', { params: { limit: 100 } })).data, [get]);
	const log = usePolling(loadLog, 10000, canRead);

	const refreshAll = () => Promise.all([stats.refresh(), online.refresh(), log.refresh()]);

	if (rbacLoading) return <Page.Loading />;
	if (!allowedActions.canRead) return <Page.NoPermissions />;
	if (stats.status === 'loading' && !stats.data) return <Page.Loading />;
	if (stats.status === 'error') {
		return (
			<Page.Error
				content={t('monitoring.load.error', 'Monitoring data could not be loaded.')}
				action={
					<Button variant="secondary" startIcon={<ArrowClockwise />} onClick={refreshAll}>
						{t('common.retry', 'Try again')}
					</Button>
				}
			/>
		);
	}

	const s = stats.data;
	const reset = async () => {
		try {
			await post('/io/reset-stats');
			toggleNotification({ type: 'success', message: t('monitoring.reset.success', 'Statistics reset.') });
			await refreshAll();
		} catch (error) {
			toggleNotification({ type: 'danger', message: t('monitoring.reset.error', 'Statistics could not be reset.') });
			throw error;
		}
	};

	const admins = online.data?.admins ?? [];
	const events = log.data?.data ?? [];
	const logEnabled = log.data?.meta?.enabled;
	const sourceLabels = {
		content: t('monitoring.log.source.content', 'Content'),
		raw: t('monitoring.log.source.raw', 'Custom'),
		test: t('monitoring.log.source.test', 'Test'),
	};

	return (
		<PageShell
			pageTitle={t('monitoring.pageTitle', 'Monitoring - Socket.IO')}
			title={t('monitoring.title', 'Monitoring')}
			subtitle={t('monitoring.subtitle', 'Live connection and event counters. Updated every 10 seconds.')}
			primaryAction={allowedActions.canManage ? <TestEventModal onSent={refreshAll} /> : undefined}
			endActions={
				<>
					<Button size="S" variant="tertiary" startIcon={<ArrowClockwise />} onClick={refreshAll}>
						{t('monitoring.refresh', 'Refresh')}
					</Button>
					{allowedActions.canManage ? (
						<ConfirmAction
							size="S"
							label={t('monitoring.reset', 'Reset statistics')}
							startIcon={<Trash />}
							title={t('monitoring.reset.title', 'Reset statistics?')}
							body={t(
								'monitoring.reset.body',
								'Event counters and the event log are cleared. Connected clients stay connected. This cannot be undone.'
							)}
							confirmLabel={t('monitoring.reset.confirm', 'Reset statistics')}
							onConfirm={reset}
						/>
					) : null}
				</>
			}
		>
			{stats.refreshError ? (
				<Alert
					variant="danger"
					closeLabel={t('common.close', 'Close')}
					title={t('monitoring.refresh.errorTitle', 'Refresh failed')}
				>
					{t('monitoring.refresh.error', 'The numbers below are from the last successful update.')}
				</Alert>
			) : null}
			<StatCards
				missingLabel={t('common.notAvailable', 'Not available')}
				items={[
					{
						id: 'connected',
						label: t('monitoring.kpi.connected', 'Connected clients'),
						value: s.connections.connected,
						hint: t(
							'monitoring.kpi.connected.hint',
							'{admin, plural, one {# admin} other {# admins}}, {user, plural, one {# user} other {# users}}, {token, plural, one {# API token} other {# API tokens}}, {public} public',
							s.connections.byKind
						),
					},
					{ id: 'rooms', label: t('monitoring.kpi.rooms', 'Active rooms'), value: s.connections.rooms },
					{
						id: 'eps',
						label: t('monitoring.kpi.eps', 'Events per second'),
						value: s.events.eventsPerSecond,
						hint: t('monitoring.kpi.eps.hint', 'Average over the last 10 seconds'),
					},
					{
						id: 'total',
						label: t('monitoring.kpi.total', 'Events sent'),
						value: s.events.totalEvents,
						hint: t('monitoring.kpi.total.hint', 'Since the last restart or reset'),
					},
				]}
			/>

			<SectionCard
				title={t('monitoring.admins.title', 'Admins online')}
				subtitle={t(
					'monitoring.admins.subtitle',
					'Admins with the Content Manager open and the entries they are editing.'
				)}
			>
				{online.status === 'error' ? (
					<EmptyStateLayout
						content={t('monitoring.admins.error', 'Admins online could not be loaded.')}
						action={
							<Button variant="secondary" onClick={online.refresh}>
								{t('common.retry', 'Try again')}
							</Button>
						}
					/>
				) : admins.length === 0 ? (
					<EmptyStateLayout
						content={t(
							'monitoring.admins.empty',
							'No admins are connected. Admins appear here while they edit an entry.'
						)}
					/>
				) : (
					<Table colCount={3} rowCount={admins.length + 1}>
						<Thead>
							<Tr>
								<Th>
									<Typography variant="sigma">{t('monitoring.admins.column.name', 'Name')}</Typography>
								</Th>
								<Th>
									<Typography variant="sigma">{t('monitoring.admins.column.editing', 'Editing')}</Typography>
								</Th>
								<Th>
									<Typography variant="sigma">{t('monitoring.admins.column.since', 'Connected')}</Typography>
								</Th>
							</Tr>
						</Thead>
						<Tbody>
							{admins.map((admin) => (
								<Tr key={admin.id}>
									<Td>
										<Flex gap={2}>
											<Avatar.Item fallback={initials(admin)} delayMs={0} />
											<Typography textColor="neutral800">
												{displayName(admin) || t('common.unnamed', 'Unnamed admin')}
											</Typography>
										</Flex>
									</Td>
									<Td>
										{admin.editing.length || admin.hiddenEditing ? (
											<Flex gap={2} wrap="wrap">
												{admin.editing.map((entry) => (
													<LinkButton
														key={`${entry.uid}:${entry.documentId}`}
														tag={Link}
														to={contentManagerPath(entry)}
														variant="tertiary"
														size="S"
													>
														{entry.contentTypeName}
													</LinkButton>
												))}
												{admin.hiddenEditing ? (
													<Typography textColor="neutral600">
														{t(
															'monitoring.admins.hidden',
															'{count, plural, one {# entry} other {# entries}} you cannot view',
															{ count: admin.hiddenEditing }
														)}
													</Typography>
												) : null}
											</Flex>
										) : (
											<Typography textColor="neutral600">{t('monitoring.admins.notEditing', 'Not editing')}</Typography>
										)}
									</Td>
									<Td>
										<Typography textColor="neutral600">
											<RelativeTime value={admin.connectedAt} />
										</Typography>
									</Td>
								</Tr>
							))}
						</Tbody>
					</Table>
				)}
			</SectionCard>

			<SectionCard
				title={t('monitoring.log.title', 'Recent events')}
				subtitle={t('monitoring.log.subtitle', 'The newest 100 events sent by the server, kept in memory.')}
			>
				{log.status === 'error' ? (
					<EmptyStateLayout
						content={t('monitoring.log.error', 'The event log could not be loaded.')}
						action={
							<Button variant="secondary" onClick={log.refresh}>
								{t('common.retry', 'Try again')}
							</Button>
						}
					/>
				) : !logEnabled && events.length === 0 ? (
					<EmptyStateLayout
						content={t(
							'monitoring.log.disabled',
							'The event log is off. Turn on "Keep an event log" in the settings to see events here.'
						)}
						action={
							<LinkButton tag={Link} to="/settings/io/settings" variant="secondary">
								{t('monitoring.log.openSettings', 'Open settings')}
							</LinkButton>
						}
					/>
				) : events.length === 0 ? (
					<EmptyStateLayout
						content={t('monitoring.log.empty', 'No events yet. Events appear here when content changes.')}
					/>
				) : (
					<Box>
						<Table colCount={4} rowCount={events.length + 1}>
							<Thead>
								<Tr>
									<Th>
										<Typography variant="sigma">{t('monitoring.log.column.time', 'Time')}</Typography>
									</Th>
									<Th>
										<Typography variant="sigma">{t('monitoring.log.column.event', 'Event')}</Typography>
									</Th>
									<Th>
										<Typography variant="sigma">{t('monitoring.log.column.source', 'Source')}</Typography>
									</Th>
									<Th>
										<Typography variant="sigma">{t('monitoring.log.column.rooms', 'Rooms')}</Typography>
									</Th>
								</Tr>
							</Thead>
							<Tbody>
								{events.map((entry) => (
									<Tr key={entry.id}>
										<Td>
											<Typography textColor="neutral600">
												<RelativeTime value={entry.timestamp} />
											</Typography>
										</Td>
										<Td>
											<Typography textColor="neutral800">{entry.event}</Typography>
										</Td>
										<Td>
											<Badge>{sourceLabels[entry.source] ?? entry.source}</Badge>
										</Td>
										<Td>
											<Typography textColor="neutral600">{entry.audiences ?? '—'}</Typography>
										</Td>
									</Tr>
								))}
							</Tbody>
						</Table>
					</Box>
				)}
			</SectionCard>
		</PageShell>
	);
};

export { MonitoringPage };
export default MonitoringPage;
