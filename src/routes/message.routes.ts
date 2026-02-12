import express from 'express';
import {
  submitMessage,
  getConversations,
  getConversationMessages,
  sendAdminReply,
  markAsRead,
  updateConversationStatus,
} from '../controllers/message.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { messageLimiter } from '../middleware/rateLimiter.middleware';
import {
  submitMessageValidation,
  sendReplyValidation,
  conversationIdValidation,
  paginationValidation,
  updateStatusValidation,
} from '../utils/validators';

const router = express.Router();

/**
 * @route   POST /api/messages/submit
 * @desc    Submit a new message from user
 * @access  Public
 */
router.post(
  '/submit',
  messageLimiter,
  validate(submitMessageValidation),
  submitMessage
);

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations (admin)
 * @access  Private (Admin)
 */
router.get(
  '/conversations',
  authenticateAdmin,
  validate(paginationValidation),
  getConversations
);

/**
 * @route   GET /api/messages/conversations/:conversationId
 * @desc    Get messages in a conversation
 * @access  Private (Admin)
 */
router.get(
  '/conversations/:conversationId',
  authenticateAdmin,
  validate([...conversationIdValidation, ...paginationValidation]),
  getConversationMessages
);

/**
 * @route   POST /api/messages/conversations/:conversationId/reply
 * @desc    Send admin reply to a conversation
 * @access  Private (Admin)
 */
router.post(
  '/conversations/:conversationId/reply',
  authenticateAdmin,
  validate(sendReplyValidation),
  sendAdminReply
);

/**
 * @route   PUT /api/messages/conversations/:conversationId/read
 * @desc    Mark messages in a conversation as read
 * @access  Private (Admin)
 */
router.put(
  '/conversations/:conversationId/read',
  authenticateAdmin,
  validate(conversationIdValidation),
  markAsRead
);

/**
 * @route   PUT /api/messages/conversations/:conversationId/status
 * @desc    Update conversation status
 * @access  Private (Admin)
 */
router.put(
  '/conversations/:conversationId/status',
  authenticateAdmin,
  validate(updateStatusValidation),
  updateConversationStatus
);

export default router;