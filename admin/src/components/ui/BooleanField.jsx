import { Field, Flex, Toggle } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTranslation } from '../../utils/getTranslation';

/**
 * Binary setting, built 1:1 like the native Strapi `BooleanInput`
 * (`@strapi/admin` FormInputs/Boolean, used by Settings > Users & Permissions
 * > Advanced settings): `Field.Root` capped at 320px, `Field.Label` above a
 * Design System `Toggle` with TRUE/FALSE labels, then `Field.Hint` and
 * `Field.Error`. The Toggle is a native checkbox input, so the label's
 * `htmlFor` (from the Field context) names it and Space toggles it.
 * Settings booleans are always set, so the native "Clear" action is omitted.
 *
 * @param {object} props - Props.
 * @param {string} props.name - Field name, also used for focus and errors.
 * @param {string} props.label - Setting name (the input's accessible name).
 * @param {string} [props.hint] - Description under the toggle.
 * @param {string} [props.error] - Inline error.
 * @param {boolean} props.checked - Value.
 * @param {(checked: boolean) => void} props.onCheckedChange - Change handler.
 * @param {boolean} [props.disabled] - Read-only.
 * @returns {JSX.Element} Field.
 */
export const BooleanField = ({ name, label, hint, error, checked, onCheckedChange, disabled }) => {
	const { formatMessage } = useIntl();
	return (
		<Field.Root name={name} hint={hint} error={error} maxWidth="320px">
			<Flex justifyContent="space-between" alignItems="flex-end" gap={2}>
				<Field.Label>{label}</Field.Label>
			</Flex>
			<Toggle
				name={name}
				checked={Boolean(checked)}
				onChange={(event) => onCheckedChange(event.currentTarget.checked)}
				disabled={disabled}
				onLabel={formatMessage({ id: getTranslation('common.true'), defaultMessage: 'True' })}
				offLabel={formatMessage({ id: getTranslation('common.false'), defaultMessage: 'False' })}
			/>
			<Field.Hint />
			<Field.Error />
		</Field.Root>
	);
};
