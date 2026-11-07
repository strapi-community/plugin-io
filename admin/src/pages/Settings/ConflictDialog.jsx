import { Button, Dialog } from '@strapi/design-system';
import { ArrowClockwise } from '@strapi/icons';
import { ConfirmDialog } from '@strapi/strapi/admin';

/**
 * Shown when a save answered 409: another administrator saved the settings
 * after this form was loaded. Nothing was saved. "Load latest settings"
 * replaces the form with the stored settings; "Keep editing" closes the
 * dialog and keeps the draft (saving again shows this dialog again).
 * Save is disabled while the request runs, so the browser drops focus to the
 * page body before the dialog opens and the dialog has nothing to return it
 * to; after closing, focus moves to Save (or the page title when Save is
 * disabled, after loading the latest settings).
 *
 * @param {object} props - Props.
 * @param {boolean} props.open - Whether the dialog is open.
 * @param {() => void} props.onKeep - Closes the dialog and keeps the draft.
 * @param {() => Promise<void>} props.onReload - Loads the stored settings.
 * @param {(id: string, fallback: string, values?: object) => string} props.t - Translator.
 * @param {() => HTMLElement | null} [props.getReturnFocus] - Element that gets focus after closing (Save).
 * @returns {JSX.Element} Dialog.
 */
export const ConflictDialog = ({ open, onKeep, onReload, t, getReturnFocus }) => {
	// Runs after React has re-rendered the header (Save may be disabled after a reload).
	const restoreFocus = () =>
		setTimeout(() => {
			const active = document.activeElement;
			if (active && active !== document.body) return;
			const target = getReturnFocus?.();
			if (target?.isConnected && !target.disabled) {
				target.focus();
				return;
			}
			const title = document.querySelector('main h1');
			if (title) {
				if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
				title.focus();
			}
		}, 50);

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onKeep();
					restoreFocus();
				}
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
					<Button
						fullWidth
						variant="default"
						startIcon={<ArrowClockwise />}
						onClick={async () => {
							await onReload();
							restoreFocus();
						}}
					>
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
};
