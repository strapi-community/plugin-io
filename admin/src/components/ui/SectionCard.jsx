import { Box, Flex, Typography } from '@strapi/design-system';

/**
 * Section container with the native settings card look (neutral0,
 * filterShadow, radius) and an h2 title with optional subtitle and action.
 * Padding is the native one at every width (6 top/bottom, 7 left/right), as
 * on Settings > Users & Permissions > Advanced settings, so fields line up
 * with the native pages on phones too.
 *
 * @param {object} props - Props.
 * @param {string} props.title - Section heading.
 * @param {string} [props.subtitle] - Description under the heading.
 * @param {import('react').ReactNode} [props.action] - Element right of the heading.
 * @param {boolean} [props.fill] - Stretch to the parent height.
 * @param {string} [props.id] - Element id (anchor target).
 * @param {import('react').ReactNode} props.children - Content.
 * @returns {JSX.Element} Section.
 */
export const SectionCard = ({ title, subtitle, action, fill = false, id, children }) => (
	<Box
		id={id}
		tag="section"
		background="neutral0"
		hasRadius
		shadow="filterShadow"
		paddingTop={6}
		paddingBottom={6}
		paddingLeft={7}
		paddingRight={7}
		minWidth={0}
		height={fill ? '100%' : undefined}
	>
		<Flex direction="column" alignItems="stretch" gap={4} height={fill ? '100%' : undefined}>
			<Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
				<Flex direction="column" alignItems="flex-start" gap={1} minWidth={0} flex="1 1 0">
					<Typography variant="delta" tag="h2">
						{title}
					</Typography>
					{subtitle ? (
						<Typography variant="pi" textColor="neutral600">
							{subtitle}
						</Typography>
					) : null}
				</Flex>
				{action ? <Flex gap={2}>{action}</Flex> : null}
			</Flex>
			{children}
		</Flex>
	</Box>
);
