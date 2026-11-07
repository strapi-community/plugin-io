import { useRef, useState } from 'react';
import { Box, Button, Field, Flex, Tag, TextInput } from '@strapi/design-system';
import { Cross, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { getTranslation } from '../../utils/getTranslation';
import { validateListEntry } from '../../utils/settings.mjs';

/**
 * Editable list of strings (origins, IP rules, field names): an input with
 * an Add button and removable tags. Entries are validated before they are
 * added, and focus moves to a neighbour tag or the input after removal.
 *
 * @param {object} props - Props.
 * @param {string} props.name - Field name.
 * @param {'origin' | 'ip' | 'field'} props.kind - Validation rule.
 * @param {string} props.label - Label.
 * @param {string} [props.hint] - Hint.
 * @param {string} [props.placeholder] - Example value.
 * @param {string} [props.error] - Server error for the list.
 * @param {string[]} props.value - Entries.
 * @param {(value: string[]) => void} props.onChange - Change handler.
 * @param {boolean} [props.disabled] - Read-only.
 * @returns {JSX.Element} Field.
 */
export const TagListField = ({ name, kind, label, hint, placeholder, error, value, onChange, disabled }) => {
	const { formatMessage } = useIntl();
	const [input, setInput] = useState('');
	const [entryError, setEntryError] = useState(null);
	const inputRef = useRef(null);
	const listRef = useRef(null);

	const messages = {
		invalid: {
			origin: formatMessage({
				id: getTranslation('settings.list.error.origin'),
				defaultMessage: 'Enter an origin like https://app.example.com, without a path.',
			}),
			ip: formatMessage({
				id: getTranslation('settings.list.error.ip'),
				defaultMessage: 'Enter an IPv4 or IPv6 address or a CIDR block like 10.0.0.0/8.',
			}),
			field: formatMessage({
				id: getTranslation('settings.list.error.field'),
				defaultMessage: 'Use letters, numbers, "_", "-" or ".".',
			}),
		},
		duplicate: formatMessage({
			id: getTranslation('settings.list.error.duplicate'),
			defaultMessage: 'This entry is already in the list.',
		}),
		required: formatMessage({
			id: getTranslation('settings.list.error.required'),
			defaultMessage: 'Enter a value first.',
		}),
	};

	const add = () => {
		const next = input.trim();
		const code = validateListEntry(kind, next, value);
		if (code) {
			setEntryError(code === 'invalid' ? messages.invalid[kind] : messages[code]);
			return;
		}
		onChange([...value, next]);
		setInput('');
		setEntryError(null);
	};

	const remove = (index) => {
		onChange(value.filter((_, i) => i !== index));
		requestAnimationFrame(() => {
			const buttons = listRef.current ? [...listRef.current.querySelectorAll('button')] : [];
			const target = buttons[index] ?? buttons[index - 1] ?? inputRef.current;
			target?.focus?.();
		});
	};

	return (
		<Flex direction="column" alignItems="stretch" gap={2}>
			<Field.Root name={name} hint={hint} error={entryError || error}>
				<Field.Label>{label}</Field.Label>
				<Flex gap={2} alignItems="flex-start">
					<Box flex="1 1 0" minWidth={0}>
						<TextInput
							ref={inputRef}
							value={input}
							placeholder={placeholder}
							disabled={disabled}
							onChange={(event) => {
								setInput(event.target.value);
								setEntryError(null);
							}}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									add();
								}
							}}
						/>
					</Box>
					<Button variant="secondary" size="L" startIcon={<Plus />} onClick={add} disabled={disabled}>
						{formatMessage({ id: getTranslation('settings.list.add'), defaultMessage: 'Add' })}
					</Button>
				</Flex>
				<Field.Hint />
				<Field.Error />
			</Field.Root>
			{value.length ? (
				<Flex ref={listRef} tag="ul" gap={2} wrap="wrap" aria-label={label}>
					{value.map((entry, index) => (
						<li key={entry}>
							<Tag
								icon={<Cross aria-hidden />}
								disabled={disabled}
								label={formatMessage(
									{ id: getTranslation('settings.list.remove'), defaultMessage: 'Remove {entry}' },
									{ entry }
								)}
								onClick={() => remove(index)}
							>
								{entry}
							</Tag>
						</li>
					))}
				</Flex>
			) : null}
		</Flex>
	);
};
