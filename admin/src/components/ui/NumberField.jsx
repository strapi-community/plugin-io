import { Field, NumberInput, Typography } from '@strapi/design-system';

/**
 * Numeric setting with label, hint, inline error and an optional unit suffix.
 * The value is passed through unchanged (no clamping); validation reports
 * out-of-range values.
 *
 * @param {object} props - Props.
 * @param {string} props.name - Field name.
 * @param {string} props.label - Label.
 * @param {string} [props.hint] - Hint.
 * @param {string} [props.error] - Error message.
 * @param {string} [props.unit] - Unit suffix, e.g. "ms".
 * @param {number | undefined} props.value - Value.
 * @param {(value: number | undefined) => void} props.onChange - Change handler.
 * @param {boolean} [props.disabled] - Read-only.
 * @returns {JSX.Element} Field.
 */
export const NumberField = ({ name, label, hint, error, unit, value, onChange, disabled }) => (
	<Field.Root name={name} hint={hint} error={error} required>
		<Field.Label>{label}</Field.Label>
		<NumberInput
			value={value ?? undefined}
			onValueChange={(next) => onChange(next)}
			disabled={disabled}
			endAction={
				unit ? (
					<Typography variant="pi" textColor="neutral600" aria-hidden>
						{unit}
					</Typography>
				) : undefined
			}
		/>
		<Field.Hint />
		<Field.Error />
	</Field.Root>
);
