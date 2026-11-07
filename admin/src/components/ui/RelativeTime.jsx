import { useState } from 'react';
import { FormattedRelativeTime, useIntl } from 'react-intl';

/**
 * Relative time ("2 minutes ago") in the admin language that keeps counting,
 * with the absolute date and time as tooltip.
 *
 * @param {{ value: string }} props - ISO timestamp.
 * @returns {JSX.Element} Time.
 * @see https://formatjs.github.io/docs/react-intl/components#formattedrelativetime
 */
export const RelativeTime = ({ value }) => {
	const { formatDate } = useIntl();
	const [renderedAt] = useState(() => Date.now());
	const seconds = Math.round((Date.parse(value) - renderedAt) / 1000);
	return (
		<time dateTime={value} title={formatDate(value, { dateStyle: 'medium', timeStyle: 'medium' })}>
			<FormattedRelativeTime value={seconds} numeric="auto" updateIntervalInSeconds={10} />
		</time>
	);
};
