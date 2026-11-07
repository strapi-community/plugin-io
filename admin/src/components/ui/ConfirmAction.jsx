import { useRef, useState } from 'react';
import { Button, Dialog } from '@strapi/design-system';
import { ConfirmDialog } from '@strapi/strapi/admin';

/**
 * Button that opens a native Strapi ConfirmDialog. The dialog stays open
 * while the action runs and after an error; focus returns to the trigger.
 *
 * @param {object} props - Props.
 * @param {string} props.label - Trigger label.
 * @param {import('react').ReactNode} [props.startIcon] - Trigger icon.
 * @param {string} [props.triggerVariant] - Trigger button variant.
 * @param {string} props.title - Dialog title (a question).
 * @param {string} props.body - What happens and whether it can be undone.
 * @param {string} props.confirmLabel - Confirm button, repeating the verb.
 * @param {() => Promise<void>} props.onConfirm - Action; throw to keep the dialog open.
 * @param {string} [props.variant] - Confirm variant (`danger`, `danger-light`, `default`).
 * @param {boolean} [props.disabled] - Disables the trigger.
 * @param {'S' | 'M' | 'L'} [props.size] - Trigger size.
 * @param {() => HTMLElement | null} [props.getFallbackFocus] - Focus target when the trigger is disabled after the action.
 * @returns {JSX.Element} Trigger and dialog.
 */
export const ConfirmAction = ({
	label,
	startIcon,
	triggerVariant = 'danger-light',
	title,
	body,
	confirmLabel,
	onConfirm,
	variant = 'danger',
	disabled = false,
	size = 'M',
	getFallbackFocus,
}) => {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const triggerRef = useRef(null);

	// Runs after React has re-rendered the trigger (it may have become disabled).
	const restoreFocus = () =>
		setTimeout(() => {
			const active = document.activeElement;
			if (active && active !== document.body) return;
			if (triggerRef.current?.isConnected && !triggerRef.current.disabled) {
				triggerRef.current.focus();
				return;
			}
			const fallback = getFallbackFocus?.();
			if (fallback) {
				if (!fallback.hasAttribute('tabindex')) fallback.setAttribute('tabindex', '-1');
				fallback.focus();
			}
		}, 50);

	const onOpenChange = (next) => {
		if (busy) return;
		setOpen(next);
		if (!next) restoreFocus();
	};

	const confirm = async (event) => {
		event?.preventDefault?.();
		setBusy(true);
		try {
			await onConfirm();
			setOpen(false);
			restoreFocus();
		} catch {
			// The caller reports the error; the dialog stays open for retry or cancel.
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Trigger>
				<Button ref={triggerRef} variant={triggerVariant} startIcon={startIcon} disabled={disabled} size={size}>
					{label}
				</Button>
			</Dialog.Trigger>
			<ConfirmDialog
				title={title}
				variant={variant}
				endAction={
					<Button fullWidth variant={variant} onClick={confirm} loading={busy}>
						{confirmLabel}
					</Button>
				}
			>
				{body}
			</ConfirmDialog>
		</Dialog.Root>
	);
};
