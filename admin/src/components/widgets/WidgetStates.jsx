import { Button, Flex, Loader, Typography } from '@strapi/design-system';
import * as StrapiAdmin from '@strapi/strapi/admin';

const NativeWidget = StrapiAdmin.Widget;
const has = (state) => typeof NativeWidget?.[state] === 'function';

/**
 * Loading state, using Strapi's `Widget.Loading` when available (5.13+).
 *
 * @param {{ label: string }} props - Accessible label.
 * @returns {JSX.Element} Loading state.
 */
export const WidgetLoading = ({ label }) =>
	has('Loading') ? (
		<NativeWidget.Loading>{label}</NativeWidget.Loading>
	) : (
		<Flex justifyContent="center" padding={4}>
			<Loader small>{label}</Loader>
		</Flex>
	);

/**
 * Error state with a retry button beside Strapi's `Widget.Error`.
 *
 * @param {{ label: string, retryLabel: string, onRetry: () => void }} props - Props.
 * @returns {JSX.Element} Error state.
 */
export const WidgetError = ({ label, retryLabel, onRetry }) => (
	<Flex direction="column" alignItems="center" gap={2} height="100%" justifyContent="center">
		{has('Error') ? (
			<NativeWidget.Error>{label}</NativeWidget.Error>
		) : (
			<Typography textColor="neutral600">{label}</Typography>
		)}
		<Button variant="tertiary" size="S" onClick={onRetry}>
			{retryLabel}
		</Button>
	</Flex>
);

/**
 * Empty state, using Strapi's `Widget.NoData` when available.
 *
 * @param {{ label: string }} props - Message.
 * @returns {JSX.Element} Empty state.
 */
export const WidgetNoData = ({ label }) =>
	has('NoData') ? (
		<NativeWidget.NoData>{label}</NativeWidget.NoData>
	) : (
		<Flex justifyContent="center" padding={4}>
			<Typography textColor="neutral600">{label}</Typography>
		</Flex>
	);
