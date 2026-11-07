import { Flex } from '@strapi/design-system';
import { Layouts, Page } from '@strapi/strapi/admin';

/**
 * Page frame used by every plugin page, matching native Strapi settings
 * pages: Page.Main, Page.Title, Layouts.Header with the primary action,
 * optional Layouts.Action and Layouts.Content.
 *
 * @param {object} props - Props.
 * @param {string} props.pageTitle - Browser tab title.
 * @param {string} props.title - h1.
 * @param {string} [props.subtitle] - Header subtitle.
 * @param {import('react').ReactNode} [props.primaryAction] - Header action.
 * @param {import('react').ReactNode} [props.startActions] - Action bar start.
 * @param {import('react').ReactNode} [props.endActions] - Action bar end.
 * @param {boolean} [props.busy] - Sets aria-busy.
 * @param {import('react').ReactNode} props.children - Sections.
 * @returns {JSX.Element} Page.
 */
export const PageShell = ({ pageTitle, title, subtitle, primaryAction, startActions, endActions, busy, children }) => (
	<Page.Main aria-busy={busy}>
		<Page.Title>{pageTitle}</Page.Title>
		<Layouts.Header title={title} subtitle={subtitle} primaryAction={primaryAction} />
		{startActions || endActions ? <Layouts.Action startActions={startActions} endActions={endActions} /> : null}
		<Layouts.Content>
			<Flex direction="column" alignItems="stretch" gap={6} minWidth={0}>
				{children}
			</Flex>
		</Layouts.Content>
	</Page.Main>
);
