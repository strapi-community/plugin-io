import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

/**
 * Four KPI cards: 4-up on desktop, 2-up from 520 px, 1-up below.
 *
 * @param {object} props - Props.
 * @param {Array<{ id: string, label: string, value: number | null, hint?: string }>} props.items - KPIs; null shows "—".
 * @param {string} props.missingLabel - Accessible label for "—".
 * @returns {JSX.Element} Grid.
 */
export const StatCards = ({ items, missingLabel }) => {
	const { formatNumber } = useIntl();
	return (
		<Grid.Root gap={4}>
			{items.map((item) => (
				<Grid.Item key={item.id} col={3} m={6} s={6} xs={12} direction="column" alignItems="stretch">
					<Box background="neutral0" hasRadius shadow="filterShadow" padding={6} height="100%">
						<Flex direction="column" alignItems="flex-start" gap={1}>
							<Typography variant="sigma" textColor="neutral600" tag="h3">
								{item.label}
							</Typography>
							{item.value === null || item.value === undefined ? (
								<Typography variant="beta" textColor="neutral800" aria-label={missingLabel}>
									—
								</Typography>
							) : (
								<Typography variant="beta" textColor="neutral800">
									{formatNumber(item.value)}
								</Typography>
							)}
							{item.hint ? (
								<Typography variant="pi" textColor="neutral600">
									{item.hint}
								</Typography>
							) : null}
						</Flex>
					</Box>
				</Grid.Item>
			))}
		</Grid.Root>
	);
};
