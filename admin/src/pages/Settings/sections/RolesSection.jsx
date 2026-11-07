import {
	Button,
	Checkbox,
	EmptyStateLayout,
	Flex,
	LinkButton,
	Loader,
	Table,
	Tbody,
	Td,
	Th,
	Thead,
	Tr,
	Typography,
} from '@strapi/design-system';
import { Link } from 'react-router-dom';
import { SectionCard } from '../../../components/ui';

/**
 * Role settings: whether clients of each Users & Permissions role may connect.
 * One Checkbox per role row, like the grant checkboxes of the native role
 * permission matrices (Users & Permissions and admin Roles).
 *
 * @param {object} props - Section props from the settings page.
 * @returns {JSX.Element} Section.
 */
export const RolesSection = ({ draft, setField, disabled, t, roles, reloadRoles }) => {
	const permissions = draft.rolePermissions || {};
	const setCanConnect = (type, canConnect) => {
		const next = { ...permissions };
		if (canConnect) delete next[type];
		else next[type] = { canConnect: false };
		setField('rolePermissions', next);
	};

	let body;
	if (roles.status === 'loading') {
		body = (
			<Flex justifyContent="center" padding={6}>
				<Loader small>{t('settings.roles.loading', 'Loading roles')}</Loader>
			</Flex>
		);
	} else if (roles.status === 'error') {
		body = (
			<EmptyStateLayout
				content={t('settings.roles.error', 'Roles could not be loaded.')}
				action={
					<Button variant="secondary" onClick={reloadRoles}>
						{t('common.retry', 'Try again')}
					</Button>
				}
			/>
		);
	} else if (!roles.data.length) {
		body = (
			<EmptyStateLayout
				content={t('settings.roles.empty', 'No roles found. Roles come from the Users & Permissions plugin.')}
			/>
		);
	} else {
		body = (
			<Table colCount={3} rowCount={roles.data.length + 1}>
				<Thead>
					<Tr>
						<Th>
							<Typography variant="sigma">{t('settings.roles.column.name', 'Role')}</Typography>
						</Th>
						<Th>
							<Typography variant="sigma">{t('settings.roles.column.description', 'Description')}</Typography>
						</Th>
						<Th>
							<Typography variant="sigma">{t('settings.roles.column.connect', 'Can connect')}</Typography>
						</Th>
					</Tr>
				</Thead>
				<Tbody>
					{roles.data.map((role) => (
						<Tr key={role.id}>
							<Td>
								<Typography textColor="neutral800" fontWeight="semiBold">
									{role.name}
								</Typography>
							</Td>
							<Td>
								<Typography textColor="neutral600">{role.description || '—'}</Typography>
							</Td>
							<Td>
								<Checkbox
									aria-label={t('settings.roles.connect.label', 'Allow {role} to connect', { role: role.name })}
									checked={permissions[role.type]?.canConnect !== false}
									onCheckedChange={(value) => setCanConnect(role.type, value === true)}
									disabled={disabled}
								/>
							</Td>
						</Tr>
					))}
				</Tbody>
			</Table>
		);
	}

	return (
		<SectionCard
			title={t('settings.roles.title', 'Roles')}
			subtitle={t(
				'settings.roles.subtitle',
				'Choose which roles may connect. What each role receives follows its permissions in Users & Permissions.'
			)}
			action={
				<LinkButton tag={Link} to="/settings/users-permissions/roles" variant="tertiary">
					{t('settings.roles.manage', 'Edit role permissions')}
				</LinkButton>
			}
		>
			{body}
		</SectionCard>
	);
};
