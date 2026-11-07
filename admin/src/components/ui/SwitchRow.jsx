import { useId } from 'react';
import { Flex, Switch, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTranslation } from '../../utils/getTranslation';

/**
 * Binary setting: title and description on the left, Switch on the right,
 * in one row that wraps text but keeps the switch horizontal.
 *
 * @param {object} props - Props.
 * @param {string} props.label - Setting name (also the switch's accessible name).
 * @param {string} [props.hint] - Description.
 * @param {boolean} props.checked - Value.
 * @param {(checked: boolean) => void} props.onCheckedChange - Change handler.
 * @param {boolean} [props.disabled] - Read-only.
 * @returns {JSX.Element} Row.
 */
export const SwitchRow = ({ label, hint, checked, onCheckedChange, disabled }) => {
	const { formatMessage } = useIntl();
	const id = useId();
	return (
		<Flex justifyContent="space-between" alignItems="center" gap={4} minWidth={0}>
			<Flex direction="column" alignItems="flex-start" gap={1} minWidth={0} flex="1 1 0">
				<Typography id={`${id}-label`} variant="omega" fontWeight="semiBold" textColor="neutral800">
					{label}
				</Typography>
				{hint ? (
					<Typography id={`${id}-hint`} variant="pi" textColor="neutral600">
						{hint}
					</Typography>
				) : null}
			</Flex>
			<Switch
				aria-labelledby={`${id}-label`}
				aria-describedby={hint ? `${id}-hint` : undefined}
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				onLabel={formatMessage({ id: getTranslation('common.on'), defaultMessage: 'On' })}
				offLabel={formatMessage({ id: getTranslation('common.off'), defaultMessage: 'Off' })}
			/>
		</Flex>
	);
};
