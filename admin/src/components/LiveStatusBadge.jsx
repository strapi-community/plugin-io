/**
 * Live Status Badge Component
 * Shows a badge in list views when content is being edited by someone.
 */
import { useState, useEffect } from 'react';
import { Badge, Tooltip, Flex, Box } from '@strapi/design-system';
import { User } from '@strapi/icons';
import styled from 'styled-components';

import { usePresenceCheck } from '../hooks/usePresence';

// Pulsing dot animation
const PulsingDot = styled.span`
	display: inline-block;
	width: 8px;
	height: 8px;
	background: #5cb176;
	border-radius: 50%;
	margin-right: 6px;
	animation: pulse 2s infinite;

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(92, 177, 118, 0.7);
		}
		70% {
			box-shadow: 0 0 0 6px rgba(92, 177, 118, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(92, 177, 118, 0);
		}
	}
`;

const LiveBadge = styled(Badge)`
	background: ${({ $isEditing }) => ($isEditing ? '#dcfce7' : 'transparent')};
	color: ${({ $isEditing }) => ($isEditing ? '#15803d' : '#666687')};
	border: 1px solid ${({ $isEditing }) => ($isEditing ? '#86efac' : '#dcdce4')};
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 8px;
	font-size: 12px;
	cursor: ${({ $isEditing }) => ($isEditing ? 'pointer' : 'default')};
`;

const EditingBadge = styled(Box)`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	background: #fef3c7;
	border: 1px solid #fcd34d;
	border-radius: 4px;
	font-size: 11px;
	color: #92400e;
`;

/**
 * Live Status Badge for list items
 * @param {object} props - Component props
 * @param {string} props.uid - Content type UID
 * @param {string} props.documentId - Document ID
 * @param {boolean} props.showDetails - Show editor count
 */
const LiveStatusBadge = ({ uid, documentId, showDetails = false }) => {
	const { checkEntity, getEntityStatus } = usePresenceCheck();
	const [status, setStatus] = useState({ isBeingEdited: false, editors: [] });

	useEffect(() => {
		if (!uid || !documentId) return;

		// Check entity status
		checkEntity(uid, documentId).then((result) => {
			setStatus(result);
		});

		// Re-check every 30 seconds
		const interval = setInterval(() => {
			checkEntity(uid, documentId).then((result) => {
				setStatus(result);
			});
		}, 30000);

		return () => clearInterval(interval);
	}, [uid, documentId, checkEntity]);

	if (!status.isBeingEdited) {
		return null;
	}

	const editorCount = status.editors.length;
	const editorNames = status.editors
		.map((e) => e.user?.firstname || e.user?.username || 'User')
		.slice(0, 3)
		.join(', ');

	return (
		<Tooltip 
			label={`Being edited by ${editorNames}${editorCount > 3 ? ` and ${editorCount - 3} more` : ''}`}
		>
			<EditingBadge>
				<PulsingDot />
				<span>
					{showDetails 
						? `${editorCount} editing` 
						: 'Live'}
				</span>
			</EditingBadge>
		</Tooltip>
	);
};

/**
 * Inline version for table cells
 */
export const LiveStatusInline = ({ uid, documentId }) => {
	const { getEntityStatus } = usePresenceCheck();
	const status = getEntityStatus(uid, documentId);

	if (!status.isBeingEdited) return null;

	return (
		<Flex alignItems="center" gap={1}>
			<PulsingDot />
		</Flex>
	);
};

/**
 * Icon-only version
 */
export const LiveStatusIcon = ({ uid, documentId, size = 16 }) => {
	const { checkEntity, getEntityStatus } = usePresenceCheck();
	const [status, setStatus] = useState({ isBeingEdited: false, editors: [] });

	useEffect(() => {
		if (!uid || !documentId) return;
		checkEntity(uid, documentId).then(setStatus);
	}, [uid, documentId, checkEntity]);

	if (!status.isBeingEdited) return null;

	return (
		<Tooltip label={`Being edited by ${status.editors.length} user(s)`}>
			<Box 
				style={{ 
					width: size, 
					height: size, 
					background: '#5cb176', 
					borderRadius: '50%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<User width={size * 0.6} height={size * 0.6} style={{ color: 'white' }} />
			</Box>
		</Tooltip>
	);
};

export default LiveStatusBadge;
