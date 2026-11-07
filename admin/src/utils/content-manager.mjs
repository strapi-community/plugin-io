/**
 * Builds the admin route to a document in the Content Manager (relative to
 * the admin base path, for react-router `Link`).
 *
 * @param {{ uid: string, documentId: string, kind?: string }} entry - Document.
 * @returns {string} Route path.
 */
export function contentManagerPath({ uid, documentId, kind }) {
  if (kind === 'singleType') return `/content-manager/single-types/${uid}`;
  return `/content-manager/collection-types/${uid}/${documentId}`;
}

/**
 * Returns initials for an avatar fallback.
 *
 * @param {{ firstname?: string | null, lastname?: string | null }} user - Admin.
 * @returns {string} One or two letters, or "?".
 */
export function initials(user) {
  const value = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase();
  return value || '?';
}

/**
 * Returns a display name.
 *
 * @param {{ firstname?: string | null, lastname?: string | null }} user - Admin.
 * @returns {string} Name, or an empty string.
 */
export function displayName(user) {
  return [user?.firstname, user?.lastname].filter(Boolean).join(' ');
}
