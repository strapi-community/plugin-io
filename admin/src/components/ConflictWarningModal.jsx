/**
 * Conflict Warning Modal Component
 * Shows a warning when multiple users are editing the same entity.
 * Offers options to continue, view changes, or leave.
 */
import { useState } from 'react';
import {
	Box,
	Button,
	Flex,
	Typography,
	Modal,
	Divider,
} from '@strapi/design-system';
import { WarningCircle, User, ArrowRight, Cross } from '@strapi/icons';
import styled from 'styled-components';

// Styled avatar
const Avatar = styled(Box)`
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: ${({ color }) => color || '#4945ff'};
	display: flex;
	align-items: center;
	justify-content: center;
	color: white;
	font-size: 14px;
	font-weight: 600;
`;

const EditorCard = styled(Box)`
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	background: #f6f6f9;
	border-radius: 4px;
	margin-bottom: 8px;

	&:last-child {
		margin-bottom: 0;
	}
`;

const WarningIcon = styled(Box)`
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: #fef3c7;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 16px;
`;

// Color palette
const AVATAR_COLORS = ['#4945ff', '#ee5e52', '#5cb176', '#f59e0b', '#0c75af'];

/**
 * Gets avatar color based on index
 */
const getAvatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

/**
 * Gets user initials
 */
const getInitials = (user) => {
	if (user.firstname && user.lastname) {
		return `${user.firstname[0]}${user.lastname[0]}`.toUpperCase();
	}
	if (user.username) {
		return user.username.substring(0, 2).toUpperCase();
	}
	return 'U';
};

/**
 * Formats relative time
 */
const formatRelativeTime = (timestamp) => {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);

	if (minutes < 1) return 'just now';
	if (minutes === 1) return '1 minute ago';
	if (minutes < 60) return `${minutes} minutes ago`;

	const hours = Math.floor(minutes / 60);
	if (hours === 1) return '1 hour ago';
	return `${hours} hours ago`;
};

/**
 * Conflict Warning Modal
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close handler
 * @param {function} props.onContinue - Continue editing handler
 * @param {function} props.onLeave - Leave and go back handler
 * @param {Array} props.editors - List of other editors
 * @param {string} props.entityName - Name of the entity being edited
 */
const ConflictWarningModal = ({
	isOpen,
	onClose,
	onContinue,
	onLeave,
	editors = [],
	entityName = 'this entry',
}) => {
	const [acknowledged, setAcknowledged] = useState(false);

	if (!isOpen) return null;

	const handleContinue = () => {
		setAcknowledged(true);
		onContinue?.();
		onClose();
	};

	const handleLeave = () => {
		onLeave?.();
		onClose();
	};

	return (
		<Modal.Root open={isOpen} onOpenChange={onClose}>
			<Modal.Content>
				<Modal.Header>
					<Modal.Title>
						<Flex alignItems="center" gap={2}>
							<WarningCircle width={20} height={20} style={{ color: '#f59e0b' }} />
							<span>Entry Already Being Edited</span>
						</Flex>
					</Modal.Title>
				</Modal.Header>

				<Modal.Body>
					<Box textAlign="center" paddingBottom={4}>
						<WarningIcon>
							<WarningCircle width={24} height={24} style={{ color: '#f59e0b' }} />
						</WarningIcon>
						<Typography variant="beta" as="h2">
							{editors.length === 1 
								? 'Someone is already editing this entry'
								: `${editors.length} people are editing this entry`}
						</Typography>
						<Typography variant="omega" textColor="neutral600" paddingTop={2}>
							Your changes may conflict with theirs. Consider coordinating before making changes.
						</Typography>
					</Box>

					<Divider />

					<Box paddingTop={4} paddingBottom={4}>
						<Typography variant="sigma" textColor="neutral600" paddingBottom={2}>
							CURRENT EDITORS
						</Typography>

						{editors.map((editor, index) => (
							<EditorCard key={editor.socketId}>
								<Avatar color={getAvatarColor(index)}>
									{getInitials(editor.user)}
								</Avatar>
								<Box>
									<Typography variant="omega" fontWeight="bold">
										{editor.user.firstname 
											? `${editor.user.firstname} ${editor.user.lastname || ''}`
											: editor.user.username || 'Unknown User'}
									</Typography>
									<Typography variant="pi" textColor="neutral600">
										Started editing {formatRelativeTime(editor.joinedAt)}
									</Typography>
								</Box>
							</EditorCard>
						))}
					</Box>

					<Box 
						background="primary100" 
						padding={3} 
						hasRadius
						style={{ border: '1px solid #d9d8ff' }}
					>
						<Flex alignItems="flex-start" gap={2}>
							<Box paddingTop={1}>
								<User width={16} height={16} style={{ color: '#4945ff' }} />
							</Box>
							<Box>
								<Typography variant="omega" fontWeight="bold" textColor="primary700">
									Collaboration Tips
								</Typography>
								<Typography variant="pi" textColor="primary600">
									- Changes are saved automatically{'\n'}
									- You will see updates from others in real-time{'\n'}
									- Consider communicating with other editors
								</Typography>
							</Box>
						</Flex>
					</Box>
				</Modal.Body>

				<Modal.Footer>
					<Flex justifyContent="space-between" width="100%">
						<Button variant="tertiary" onClick={handleLeave}>
							<Flex alignItems="center" gap={2}>
								<Cross width={12} height={12} />
								<span>Leave</span>
							</Flex>
						</Button>
						<Button onClick={handleContinue}>
							<Flex alignItems="center" gap={2}>
								<span>Continue Editing</span>
								<ArrowRight width={12} height={12} />
							</Flex>
						</Button>
					</Flex>
				</Modal.Footer>
			</Modal.Content>
		</Modal.Root>
	);
};

/**
 * Hook for managing conflict modal state
 */
export const useConflictWarning = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [editors, setEditors] = useState([]);
	const [entityName, setEntityName] = useState('');

	const showWarning = (editorList, name = '') => {
		if (editorList.length > 0) {
			setEditors(editorList);
			setEntityName(name);
			setIsOpen(true);
		}
	};

	const hideWarning = () => {
		setIsOpen(false);
	};

	return {
		isOpen,
		editors,
		entityName,
		showWarning,
		hideWarning,
	};
};

export default ConflictWarningModal;
