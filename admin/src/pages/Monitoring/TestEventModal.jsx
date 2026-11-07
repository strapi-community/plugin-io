import { useState } from 'react';
import { Button, Field, Flex, JSONInput, Modal, TextInput, Typography } from '@strapi/design-system';
import { PaperPlane } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useT } from '../../hooks/useT';
import { serverErrorsToFields } from '../../utils/settings.mjs';

const NAME_RE = /^[a-zA-Z0-9:._-]{1,99}$/;
const MAX_BYTES = 8 * 1024;

/**
 * Validates a test event locally (the server checks again).
 *
 * @param {string} name - Event name.
 * @param {string} json - Payload text.
 * @param {Function} t - Translator.
 * @returns {{ errors: { eventName?: string, data?: string }, data?: any }} Result.
 */
function validate(name, json, t) {
	const errors = {};
	if (!NAME_RE.test(name)) {
		errors.eventName = t('monitoring.test.name.error', 'Use 1 to 99 letters, numbers, ":", ".", "_" or "-".');
	}
	let data;
	if (json.trim()) {
		try {
			data = JSON.parse(json);
			if (new TextEncoder().encode(json).length > MAX_BYTES) throw new Error('size');
		} catch {
			errors.data = t('monitoring.test.data.error', 'Enter valid JSON up to 8 KB.');
		}
	}
	return { errors, data };
}

/**
 * "Send test event" dialog. The hint states that every connected client
 * receives the event.
 *
 * @param {{ onSent: () => void }} props - Called after a successful send.
 * @returns {JSX.Element} Trigger and modal.
 */
export const TestEventModal = ({ onSent }) => {
	const t = useT();
	const { post } = useFetchClient();
	const { toggleNotification } = useNotification();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('test:ping');
	const [json, setJson] = useState('{\n  "message": "Hello"\n}');
	const [errors, setErrors] = useState({});
	const [sending, setSending] = useState(false);

	const send = async () => {
		const result = validate(name, json, t);
		setErrors(result.errors);
		if (Object.keys(result.errors).length) return;
		setSending(true);
		try {
			const { data } = await post('/io/test-event', { eventName: name, data: result.data });
			toggleNotification({
				type: 'success',
				message: t(
					'monitoring.test.success',
					'{count, plural, =0 {Test event sent. No clients are connected.} one {Test event sent to # client.} other {Test event sent to # clients.}}',
					{ count: data.data.recipients }
				),
			});
			setOpen(false);
			onSent?.();
		} catch (error) {
			const fields = serverErrorsToFields(error);
			setErrors(fields);
			if (!Object.keys(fields).length) {
				toggleNotification({ type: 'danger', message: t('monitoring.test.error', 'Test event could not be sent.') });
			}
		} finally {
			setSending(false);
		}
	};

	return (
		<Modal.Root open={open} onOpenChange={(next) => !sending && setOpen(next)}>
			<Modal.Trigger>
				<Button size="S" startIcon={<PaperPlane />}>
					{t('monitoring.test.open', 'Send test event')}
				</Button>
			</Modal.Trigger>
			<Modal.Content>
				<Modal.Header>
					<Modal.Title>{t('monitoring.test.title', 'Send test event')}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Flex direction="column" alignItems="stretch" gap={6}>
						<Typography variant="omega" textColor="neutral600">
							{t(
								'monitoring.test.description',
								'Every connected client receives this event, including public frontends.'
							)}
						</Typography>
						<Field.Root
							name="eventName"
							error={errors.eventName}
							hint={t('monitoring.test.name.hint', 'Content and presence event names are not allowed.')}
							required
						>
							<Field.Label>{t('monitoring.test.name.label', 'Event name')}</Field.Label>
							<TextInput value={name} onChange={(event) => setName(event.target.value)} />
							<Field.Hint />
							<Field.Error />
						</Field.Root>
						<Field.Root
							name="data"
							error={errors.data}
							hint={t('monitoring.test.data.hint', 'Optional JSON payload, up to 8 KB.')}
						>
							<Field.Label>{t('monitoring.test.data.label', 'Payload')}</Field.Label>
							<JSONInput value={json} onChange={setJson} minHeight="14rem" />
							<Field.Hint />
							<Field.Error />
						</Field.Root>
					</Flex>
				</Modal.Body>
				<Modal.Footer>
					<Modal.Close>
						<Button variant="tertiary" disabled={sending}>
							{t('common.cancel', 'Cancel')}
						</Button>
					</Modal.Close>
					<Button onClick={send} loading={sending} startIcon={<PaperPlane />}>
						{t('monitoring.test.send', 'Send to all clients')}
					</Button>
				</Modal.Footer>
			</Modal.Content>
		</Modal.Root>
	);
};
