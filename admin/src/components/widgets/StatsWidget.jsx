import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useSocketStats } from '../../hooks/useMonitoringData';
import { useT } from '../../hooks/useT';
import { WidgetError, WidgetLoading } from './WidgetStates';

/**
 * Homepage widget "Socket.IO": four counters in a 2×2 grid.
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
	const tiles = [
		{ id: 'connected', label: t('widget.stats.connected', 'Connected clients'), value: connections.connected },
		{ id: 'admins', label: t('widget.stats.admins', 'Admins online'), value: connections.byKind.admin },
		{ id: 'eps', label: t('widget.stats.eps', 'Events per second'), value: events.eventsPerSecond },
		{ id: 'total', label: t('widget.stats.total', 'Events sent'), value: events.totalEvents },
	];

	return (
		<Grid.Root gap={2}>
			{tiles.map((tile) => (
				<Grid.Item key={tile.id} col={6} direction="column" alignItems="stretch">
					<Box background="neutral100" hasRadius padding={3} height="100%">
						<Flex direction="column" alignItems="flex-start" gap={1}>
							<Typography variant="pi" textColor="neutral600">
								{tile.label}
							</Typography>
							<Typography variant="delta" tag="p" textColor="neutral800">
								{formatNumber(tile.value)}
							</Typography>
						</Flex>
					</Box>
				</Grid.Item>
			))}
		</Grid.Root>
	);
};

export { StatsWidget };
export default StatsWidget;
