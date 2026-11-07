/**
 * Client-side settings rules. They mirror the server schema
 * (server/src/utils/settings-schema.js) so errors show inline before Save;
 * the server validates again and its answer wins.
 */

export const CONTENT_ACTIONS = Object.freeze(['create', 'update', 'delete', 'publish', 'unpublish', 'discardDraft']);

/** Actions that only exist for draft-and-publish content types. */
export const DRAFT_ACTIONS = Object.freeze(['publish', 'unpublish', 'discardDraft']);

export const LIMITS = Object.freeze({
  maxConnections: { min: 0, max: 100000 },
  ms: { min: 1000, max: 600000 },
  maxEventsPerSecond: { min: 1, max: 1000 },
  maxEventLogSize: { min: 10, max: 1000 },
});

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]+(%\w+)?$/;
const FIELD = /^[A-Za-z0-9_.-]{1,100}$/;

/**
 * Checks that a value is an exact http(s) origin.
 *
 * @param {string} value - Candidate.
 * @returns {boolean} True for e.g. `https://app.example.com`.
 */
export function isExactOrigin(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
}

/**
 * Checks that a value is an IPv4/IPv6 address or CIDR block.
 *
 * @param {string} value - Candidate.
 * @returns {boolean} True when valid.
 */
export function isIpOrCidr(value) {
  if (typeof value !== 'string' || !value || value.length > 64) return false;
  const [address, mask, extra] = value.split('/');
  if (extra !== undefined) return false;
  const v4 = IPV4.test(address);
  const v6 = !v4 && address.includes(':') && IPV6.test(address);
  if (!v4 && !v6) return false;
  if (mask === undefined) return true;
  if (!/^\d{1,3}$/.test(mask)) return false;
  return Number(mask) <= (v4 ? 32 : 128);
}

/**
 * Checks that a value is a usable field name.
 *
 * @param {string} value - Candidate.
 * @returns {boolean} True when valid.
 */
export const isFieldName = (value) => typeof value === 'string' && FIELD.test(value);

const intIn = (value, { min, max }) => Number.isInteger(value) && value >= min && value <= max;

/**
 * Validates the settings draft. Returns error codes keyed by field path;
 * the page turns codes into translated messages.
 *
 * @param {object} draft - Settings draft.
 * @returns {Record<string, string>} Errors, e.g. `{ 'connection.pingTimeout': 'range' }`.
 */
export function validateSettings(draft) {
  const errors = {};
  const range = (path, value, limits) => {
    if (!intIn(value, limits)) errors[path] = 'range';
  };
  range('connection.maxConnections', draft.connection?.maxConnections, LIMITS.maxConnections);
  range('connection.pingInterval', draft.connection?.pingInterval, LIMITS.ms);
  range('connection.pingTimeout', draft.connection?.pingTimeout, LIMITS.ms);
  range('connection.connectionTimeout', draft.connection?.connectionTimeout, LIMITS.ms);
  if (draft.security?.rateLimiting?.enabled) {
    range(
      'security.rateLimiting.maxEventsPerSecond',
      draft.security.rateLimiting.maxEventsPerSecond,
      LIMITS.maxEventsPerSecond
    );
  }
  range('monitoring.maxEventLogSize', draft.monitoring?.maxEventLogSize, LIMITS.maxEventLogSize);
  return errors;
}

/**
 * Validates a value before it is added to a tag list.
 *
 * @param {'origin' | 'ip' | 'field'} kind - List kind.
 * @param {string} value - Trimmed value.
 * @param {string[]} list - Current entries.
 * @returns {'required' | 'invalid' | 'duplicate' | null} Error code or null.
 */
export function validateListEntry(kind, value, list) {
  if (!value) return 'required';
  const valid = kind === 'origin' ? isExactOrigin(value) : kind === 'ip' ? isIpOrCidr(value) : isFieldName(value);
  if (!valid) return 'invalid';
  if (list.includes(value)) return 'duplicate';
  return null;
}

/**
 * Deep equality for JSON-like values.
 *
 * @param {any} a - First value.
 * @param {any} b - Second value.
 * @returns {boolean} True when equal.
 */
export function isEqual(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

const sortKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
};

/**
 * Sets a nested value immutably.
 *
 * @param {object} obj - Source.
 * @param {string} path - Dot path.
 * @param {any} value - New value.
 * @returns {object} Updated copy.
 */
export function setIn(obj, path, value) {
  const [head, ...rest] = path.split('.');
  return { ...obj, [head]: rest.length ? setIn(obj?.[head] ?? {}, rest.join('.'), value) : value };
}

/**
 * Lists the top-level sections whose stored value differs from the draft.
 *
 * @param {object} draft - Submitted values.
 * @param {object} stored - Values returned by the server.
 * @returns {string[]} Section keys.
 */
export function changedSections(draft, stored) {
  return Object.keys(stored).filter((key) => key !== 'version' && !isEqual(draft[key], stored[key]));
}

/**
 * Maps Strapi validation details (`error.details.errors[].path`) to a
 * dot-path error map.
 *
 * @param {any} error - Error from `useFetchClient`.
 * @returns {Record<string, string>} Messages by path.
 */
export function serverErrorsToFields(error) {
  const list = error?.response?.data?.error?.details?.errors;
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(list.map((entry) => [entry.path.join('.'), entry.message]));
}
