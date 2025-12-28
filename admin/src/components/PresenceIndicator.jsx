/**
 * Presence Indicator Component
 * Displays avatars of users currently editing the same entity.
 * Inspired by Figma/Notion collaboration indicators.
 */
import { useState, useEffect } from 'react';
import { Box, Flex, Typography, Tooltip } from '@strapi/design-system';
import { User } from '@strapi/icons';
import styled from 'styled-components';

import { usePresence } from '../hooks/usePresence';

// Styled components for avatars
const AvatarStack = styled(Flex)`
	position: relative;
`;

const Avatar = styled(Box)`
	width: ${({ size }) => size || 32}px;
	height: ${({ size }) => size || 32}px;
	border-radius: 50%;
	background: ${({ color }) => color || '#4945ff'};
	display: flex;
	align-items: center;
	justify-content: center;
	color: white;
	font-size: ${({ size }) => (size || 32) * 0.4}px;
	font-weight: 600;
	border: 2px solid white;
	margin-left: ${({ $stacked }) => ($stacked ? '-8px' : '0')};
	position: relative;
	z-index: ${({ $zIndex }) => $zIndex || 1};
	cursor: pointer;
	transition: transform 0.2s ease;

	&:hover {
		transform: scale(1.1);
		z-index: 100;
	}

	&:first-child {
		margin-left: 0;
	}
`;

const OnlineDot = styled.span`
	position: absolute;
	bottom: 0;
	right: 0;
	width: 10px;
	height: 10px;
	background: #5cb176;
	border-radius: 50%;
	border: 2px solid white;
`;

const TypingIndicator = styled.span`
	position: absolute;
	bottom: -4px;
	right: -4px;
	width: 16px;
	height: 16px;
	background: #f59e0b;
	border-radius: 50%;
	border: 2px solid white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;

	&::after {
		content: '...';
		animation: typing 1s infinite;
	}

	@keyframes typing {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}
`;

const MoreIndicator = styled(Avatar)`
	background: #666687;
	font-size: 11px;
`;

// Color palette for user avatars
const AVATAR_COLORS = [
	'#4945ff', // Primary
	'#ee5e52', // Danger
	'#5cb176', // Success
	'#f59e0b', // Warning
	'#0c75af', // Info
	'#7b79ff', // Secondary
	'#be5d01', // Alternative
];

/**
 * Gets avatar color based on user ID
 * @param {number|string} userId - User ID
 * @returns {string} Color hex
 */
const getAvatarColor = (userId) => {
	const index = typeof userId === 'number' ? userId : userId?.charCodeAt(0) || 0;
	return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

/**
 * Gets user initials
 * @param {object} user - User object
 * @returns {string} Initials
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
 * Presence Indicator Component
 * @param {object} props - Component props
 * @param {string} props.uid - Content type UID
 * @param {string} props.documentId - Document ID
 * @param {number} props.maxVisible - Maximum visible avatars
 * @param {number} props.size - Avatar size in pixels
 * @param {boolean} props.showTyping - Show typing indicators
 */
const PresenceIndicator = ({ 
	uid, 
	documentId, 
	maxVisible = 3, 
	size = 32,
	showTyping = true,
}) => {
	const { 
		otherEditors, 
		otherEditorCount, 
		isBeingEditedByOthers,
		typingUsers,
	} = usePresence(uid, documentId);

	// If no other editors, don't render
	if (!isBeingEditedByOthers) {
		return null;
	}

	const visibleEditors = otherEditors.slice(0, maxVisible);
	const hiddenCount = otherEditorCount - maxVisible;

	// Check if a user is typing
	const isUserTyping = (userId) => {
		return typingUsers.some(t => t.user?.id === userId);
	};

	return (
		<Box>
			<Flex alignItems="center" gap={2}>
				<AvatarStack alignItems="center">
					{visibleEditors.map((editor, index) => {
						const user = editor.user;
						const typing = isUserTyping(user.id);
						
						return (
							<Tooltip 
								key={editor.socketId}
								label={`${user.firstname || user.username || 'User'} ${user.lastname || ''} ${typing ? '(typing...)' : ''}`}
							>
								<Avatar
									color={getAvatarColor(user.id)}
									size={size}
									$stacked={index > 0}
									$zIndex={visibleEditors.length - index}
								>
									{getInitials(user)}
									<OnlineDot />
									{showTyping && typing && <TypingIndicator />}
								</Avatar>
							</Tooltip>
						);
					})}

					{hiddenCount > 0 && (
						<Tooltip label={`${hiddenCount} more editor(s)`}>
							<MoreIndicator size={size} $stacked>
								+{hiddenCount}
							</MoreIndicator>
						</Tooltip>
					)}
				</AvatarStack>

				<Typography variant="pi" textColor="neutral600">
					{otherEditorCount === 1 
						? '1 other editing' 
						: `${otherEditorCount} others editing`}
				</Typography>
			</Flex>
		</Box>
	);
};

/**
 * Compact version for tight spaces
 */
export const PresenceIndicatorCompact = ({ uid, documentId, size = 24 }) => {
	const { otherEditors, isBeingEditedByOthers } = usePresence(uid, documentId);

	if (!isBeingEditedByOthers) return null;

	return (
		<Tooltip label={`Being edited by ${otherEditors.length} user(s)`}>
			<Flex alignItems="center" gap={1}>
				<Avatar color="#4945ff" size={size}>
					<User width={14} height={14} />
				</Avatar>
				{otherEditors.length > 1 && (
					<Typography variant="pi" textColor="neutral600">
						+{otherEditors.length - 1}
					</Typography>
				)}
			</Flex>
		</Tooltip>
	);
};

/**
 * Banner version for edit view header
 */
export const PresenceBanner = ({ uid, documentId }) => {
	const { otherEditors, isBeingEditedByOthers, typingUsers } = usePresence(uid, documentId);

	if (!isBeingEditedByOthers) return null;

	const editorNames = otherEditors
		.map(e => e.user.firstname || e.user.username || 'Someone')
		.join(', ');

	const typingNames = typingUsers
		.map(t => t.user.username || 'Someone')
		.join(', ');

	return (
		<Box 
			background="warning100" 
			padding={3} 
			hasRadius 
			marginBottom={4}
			style={{ border: '1px solid #f59e0b' }}
		>
			<Flex alignItems="center" gap={3}>
				<Flex>
					{otherEditors.slice(0, 3).map((editor, index) => (
						<Avatar
							key={editor.socketId}
							color={getAvatarColor(editor.user.id)}
							size={28}
							$stacked={index > 0}
							$zIndex={3 - index}
						>
							{getInitials(editor.user)}
						</Avatar>
					))}
				</Flex>
				<Box>
					<Typography variant="omega" fontWeight="bold" textColor="warning700">
						{editorNames} {otherEditors.length === 1 ? 'is' : 'are'} also editing
					</Typography>
					{typingNames && (
						<Typography variant="pi" textColor="warning600">
							{typingNames} {typingUsers.length === 1 ? 'is' : 'are'} typing...
						</Typography>
					)}
				</Box>
			</Flex>
		</Box>
	);
};

export default PresenceIndicator;
