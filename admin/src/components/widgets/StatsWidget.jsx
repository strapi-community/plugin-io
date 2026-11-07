import { BaseLink, Box, Flex, Grid, Typography } from '@strapi/design-system';
import { Earth, Lightning, PaperPlane, User } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { useSocketStats } from '../../hooks/useMonitoringData';
import { useT } from '../../hooks/useT';
import { WidgetError, WidgetLoading } from './WidgetStates';

const MONITORING_PATH = '/settings/io/monitoring';

/**
 * Homepage widget "Socket.IO". Mirrors the native "Project statistics"
 * widget (`@strapi/admin` KeyStatisticsWidget): a bordered two-column grid
 * of link cells, each with a tinted icon, a bold label and a compact number.
 * Labels use neutral600 instead of the native neutral500, which measures
 * 3.19:1 on neutral0 and fails WCAG 1.4.3.
 *
 * @returns {JSX.Element} Widget body.
 */
const StatsWidget = () => {
	const t = useT();
	const { formatNumber } = useIntl();
	const stats = useSocketStats(15000);

	if (stats.status === 'loading') return <WidgetLoading label={t('widget.stats.loading', 'Loading statistics')} />;
	if (stats.status === 'error') {
		return (
			<WidgetError
				label={t('widget.stats.error', 'Statistics could not be loaded.')}
				retryLabel={t('common.retry', 'Try again')}
				onRetry={stats.refresh}
			/>
		);
	}

	const { connections, events } = stats.data;
	const cells = [
		{
			id: 'connected',
			label: t('widget.stats.connected', 'Connected clients'),
			value: connections.connected,
			icon: <Earth />,
			tone: 'primary',
		},
		{
			id: 'admins',
			label: t('widget.stats.admins', 'Admins online'),
			value: connections.byKind.admin,
			icon: <User />,
			tone: 'danger',
		},
		{
			id: 'eps',
			label: t('widget.stats.eps', 'Events per second'),
			value: events.eventsPerSecond,
			icon: <Lightning />,
			tone: 'warning',
		},
		{
			id: 'total',
			label: t('widget.stats.total', 'Events sent'),
			value: events.totalEvents,
			icon: <PaperPlane />,
			tone: 'secondary',
		},
	];

	return (
		<Box borderColor="neutral200" borderStyle="solid" borderWidth="1px" hasRadius overflow="hidden">
			<Grid.Root gap={0}>
				{cells.map((cell, index) => (
					<Grid.Item key={cell.id} col={6} direction="column" alignItems="stretch">
						<BaseLink
							tag={Link}
							to={MONITORING_PATH}
							padding={3}
							height="100%"
							borderColor="neutral200"
							borderStyle="solid"
							borderWidth={`0 ${index % 2 === 0 ? '1px' : '0'} ${index < cells.length - 2 ? '1px' : '0'} 0`}
						>
							<Flex alignItems="center" gap={2}>
								<Flex padding={2} borderRadius={1} background={`${cell.tone}100`} color={`${cell.tone}600`}>
									{cell.icon}
								</Flex>
								<Flex direction="column" alignItems="flex-start">
									<Typography variant="pi" fontWeight="bold" textColor="neutral600">
										{cell.label}
									</Typography>
									<Typography variant="omega" fontWeight="bold" textColor="neutral800">
										{formatNumber(cell.value, { notation: 'compact', maximumFractionDigits: 1 })}
									</Typography>
								</Flex>
							</Flex>
						</BaseLink>
					</Grid.Item>
				))}
			</Grid.Root>
		</Box>
	);
};

export { StatsWidget };
export default StatsWidget;
