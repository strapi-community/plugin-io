import { useRef, useState } from 'react';
import { Box, Button, Dialog, Flex, Typography, VisuallyHidden } from '@strapi/design-system';
import { Download, Upload } from '@strapi/icons';
import { ConfirmDialog, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { SectionCard } from '../../../components/ui';
import { diffSettings, formatSettingValue, parseImportFile, serverErrorsToFields } from '../../../utils/settings.mjs';

const PREVIEW_LIMIT = 20;

/**
 * Settings export and import. Export downloads the saved settings as JSON
 * (they hold no secrets: origins, IP rules, roles and limits only). Import
 * sends the file to `POST /io/settings/validate`, which checks it with the
 * same strict schema as Save; the differences to the form are listed in a
 * confirmation dialog and, once confirmed, replace the form values. Nothing
 * is stored until Save.
 *
 * @param {object} props - Props.
 * @param {object} props.saved - Saved settings (exported).
 * @param {object} props.draft - Current form values (compared on import).
 * @param {(values: object) => void} props.onApply - Replaces the form values.
 * @param {boolean} props.canUpdate - Whether the admin may import.
 * @param {boolean} props.busy - Disables import while saving.
 * @param {(id: string, fallback: string, values?: object) => string} props.t - Translator.
 * @returns {JSX.Element} Section.
 */
export const BackupSection = ({ saved, draft, onApply, canUpdate, busy, t }) => {
	const { post } = useFetchClient();
	const { toggleNotification } = useNotification();
	const fileRef = useRef(null);
	const importRef = useRef(null);
	const [reading, setReading] = useState(false);
	const [pending, setPending] = useState(null);

	const exportSettings = () => {
		const blob = new Blob([`${JSON.stringify(saved, null, 2)}\n`], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `socket-io-settings-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 0);
		toggleNotification({ type: 'success', message: t('settings.backup.exported', 'Settings exported.') });
	};

	const fail = (message) => {
		toggleNotification({ type: 'danger', message });
		importRef.current?.focus();
	};

	const onFile = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setReading(true);
		try {
			const parsed = parseImportFile(await file.text(), file.size);
			if (!parsed.ok) {
				fail(
					parsed.code === 'size'
						? t('settings.backup.error.size', 'The file is larger than 256 KB.')
						: t('settings.backup.error.json', 'The file is not a JSON settings export.')
				);
				return;
			}
			let next;
			try {
				const { data } = await post('/io/settings/validate', parsed.value);
				next = data.data;
			} catch (error) {
				const paths = Object.keys(serverErrorsToFields(error));
				fail(
					paths.length
						? t('settings.backup.error.invalid', 'The file has invalid values: {paths}.', {
								paths: paths.slice(0, 3).join(', '),
							})
						: t('settings.backup.error.request', 'The file could not be checked. Try again.')
				);
				return;
			}
			const changes = diffSettings(draft, next);
			if (!changes.length) {
				toggleNotification({
					type: 'info',
					message: t('settings.backup.same', 'The file matches the current form. Nothing to import.'),
				});
				importRef.current?.focus();
				return;
			}
			setPending({ values: next, changes });
		} finally {
			setReading(false);
		}
	};

	const close = () => {
		setPending(null);
		setTimeout(() => importRef.current?.focus(), 50);
	};

	const apply = () => {
		onApply(pending.values);
		toggleNotification({
			type: 'success',
			message: t('settings.backup.applied', 'Imported values are in the form. Save to apply them.'),
		});
		close();
	};

	return (
		<SectionCard
			title={t('settings.backup.title', 'Export and import')}
			subtitle={t(
				'settings.backup.subtitle',
				'Copy settings between projects. The file contains no secrets. Imported values are checked and shown before they replace the form.'
			)}
		>
			<Flex gap={2} wrap="wrap">
				<Button variant="secondary" startIcon={<Download />} onClick={exportSettings}>
					{t('settings.backup.export', 'Export settings')}
				</Button>
				<Button
					ref={importRef}
					variant="secondary"
					startIcon={<Upload />}
					onClick={() => fileRef.current?.click()}
					loading={reading}
					disabled={!canUpdate || busy}
				>
					{t('settings.backup.import', 'Import settings')}
				</Button>
				<VisuallyHidden>
					<input
						ref={fileRef}
						type="file"
						accept="application/json,.json"
						tabIndex={-1}
						aria-hidden="true"
						onChange={onFile}
					/>
				</VisuallyHidden>
			</Flex>
			<Dialog.Root open={Boolean(pending)} onOpenChange={(open) => !open && close()}>
				{pending ? (
					<ConfirmDialog
						title={t('settings.backup.confirm.title', 'Replace form values?')}
						variant="default"
						endAction={
							<Button fullWidth onClick={apply}>
								{t('settings.backup.confirm.action', 'Replace values')}
							</Button>
						}
					>
						<Flex direction="column" alignItems="stretch" gap={3}>
							<Typography variant="omega">
								{t(
									'settings.backup.confirm.body',
									'{count, plural, one {# value changes} other {# values change}}. Unsaved edits in these fields are replaced. Nothing is stored until you save.',
									{ count: pending.changes.length }
								)}
							</Typography>
							<Box tag="ul" maxHeight="24rem" overflow="auto">
								{pending.changes.slice(0, PREVIEW_LIMIT).map((change) => (
									<Box tag="li" key={change.path} paddingBottom={2}>
										<Typography variant="pi" fontWeight="semiBold" textColor="neutral800" tag="p">
											{change.path}
										</Typography>
										<Typography variant="pi" textColor="neutral600" tag="p">
											{t('settings.backup.confirm.change', '{before} to {after}', {
												before: formatSettingValue(change.before),
												after: formatSettingValue(change.after),
											})}
										</Typography>
									</Box>
								))}
							</Box>
							{pending.changes.length > PREVIEW_LIMIT ? (
								<Typography variant="pi" textColor="neutral600">
									{t('settings.backup.confirm.more', 'And {count} more.', {
										count: pending.changes.length - PREVIEW_LIMIT,
									})}
								</Typography>
							) : null}
						</Flex>
					</ConfirmDialog>
				) : null}
			</Dialog.Root>
		</SectionCard>
	);
};
