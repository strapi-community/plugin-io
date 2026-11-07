import { Lightning } from '@strapi/icons';

/**
 * Plugin icon used for the settings section and homepage widgets. Props are
 * forwarded so the admin can set `fill` (widgets render icons in neutral500).
 *
 * @param {object} props - Icon props such as `fill`.
 * @returns {JSX.Element} Icon.
 */
const PluginIcon = (props) => <Lightning aria-hidden {...props} />;

export { PluginIcon };
