import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { getTranslation } from '../utils/getTranslation';

/**
 * Returns `t(key, defaultMessage, values)` bound to the plugin namespace.
 * Keys are literal strings so the i18n completeness test can find them.
 *
 * @returns {(id: string, defaultMessage: string, values?: object) => string} Translator.
 */
export function useT() {
	const { formatMessage } = useIntl();
	return useCallback(
		(id, defaultMessage, values) => formatMessage({ id: getTranslation(id), defaultMessage }, values),
		[formatMessage]
	);
}
