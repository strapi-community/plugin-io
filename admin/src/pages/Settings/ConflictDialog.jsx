import { Button, Dialog } from '@strapi/design-system';
import { ArrowClockwise } from '@strapi/icons';
import { ConfirmDialog } from '@strapi/strapi/admin';

/**
 * Shown when a save answered 409: another administrator saved the settings
 * after this form was loaded. Nothing was saved. "Load latest settings"
 * replaces the form with the stored settings; "Keep editing" closes the
 * dialog and keeps the draft (saving again shows this dialog again).
 *
 * @param {object} props - Props.
 * @param {boolean} props.open - Whether the dialog is open.
 * @param {() => void} props.onKeep - Closes the dialog and keeps the draft.
 * @param {() => Promise<void>} props.onReload - Loads the stored settings.
 * @param {(id: string, fallback: string, values?: object) => string} props.t - Translator.
 * @returns {JSX.Element} Dialog.
 */
export const ConflictDialog = ({ open, onKeep, onReload, t }) => (
	<Dialog.Root
		open={open}
		onOpenChange={(next) => {
			if (!next) onKeep();
		}}
	>
		<ConfirmDialog
			title={t('settings.conflict.title', 'Settings changed in the meantime')}
			variant="default"
			startAction={
				<Dialog.Cancel>
					<Button fullWidth variant="tertiary">
						{t('settings.conflict.keep', 'Keep editing')}
					</Button>
				</Dialog.Cancel>
			}
			endAction={
				<Button fullWidth variant="default" startIcon={<ArrowClockwise />} onClick={onReload}>
					{t('settings.conflict.reload', 'Load latest settings')}
				</Button>
			}
		>
			{t(
				'settings.conflict.body',
				'Another administrator saved the settings after you opened this page, so your changes were not saved. Load the latest settings and apply your changes again.'
			)}
		</ConfirmDialog>
	</Dialog.Root>
);
