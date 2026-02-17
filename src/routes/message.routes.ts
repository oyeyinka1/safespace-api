import express from "express";
import {
  submitMessage,
  getConversations,
  getConversationMessages,
  sendAdminReply,
  markAsRead,
  updateConversationStatus,
  getUserConversations,
} from "../controllers/message.controller";

import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/requireAdmin.middleware";
import { requireUser } from "../middleware/requireUser.middleware";

import { validate } from "../middleware/validation.middleware";
import { messageLimiter } from "../middleware/rateLimiter.middleware";

import {
  submitMessageValidation,
  sendReplyValidation,
  conversationIdValidation,
  paginationValidation,
  updateStatusValidation
} from "../utils/validators";

const router = express.Router();

/**
 * ================= USER ROUTES =================
 */

/**
 * @route   POST /api/messages
 * @desc    Submit a new message (User)
 * @access  Private (User)
 */
router.post(
  "/",
  authenticate,
  requireUser,
  messageLimiter,
  validate(submitMessageValidation),
  submitMessage
);

/**
 * @route   GET /api/messages/my-conversations
 * @desc    Get logged-in user's conversations
 * @access  Private (User)
 */
router.get(
  "/my-conversations",
  authenticate,
  requireUser,
  validate(paginationValidation),
  getUserConversations
);

/**
 * ================= ADMIN ROUTES =================
 */

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations
 * @access  Private (Admin)
 */
router.get(
  "/conversations",
  authenticate,
  requireAdmin,
  validate(paginationValidation),
  getConversations
);

/**
 * @route   POST /api/messages/conversations/:conversationId/reply
 * @desc    Send admin reply
 * @access  Private (Admin)
 */
router.post(
  "/conversations/:conversationId/reply",
  authenticate,
  requireAdmin,
  validate(sendReplyValidation),
  sendAdminReply
);

/**
 * @route   PUT /api/messages/conversations/:conversationId/read
 * @desc    Mark as read (Admin)
 * @access  Private (Admin)
 */
router.put(
  "/conversations/:conversationId/read",
  authenticate,
  requireAdmin,
  validate(conversationIdValidation),
  markAsRead
);

/**
 * @route   PUT /api/messages/conversations/:conversationId/status
 * @desc    Update status (Admin)
 * @access  Private (Admin)
 */
router.put(
  "/conversations/:conversationId/status",
  authenticate,
  requireAdmin,
  validate(updateStatusValidation),
  updateConversationStatus
);

/**
 * ================= SHARED ROUTE =================
 */

/**
 * @route   GET /api/messages/conversations/:conversationId
 * @desc    Get messages in conversation
 * @access  Private (User who owns it OR Admin)
 */
router.get(
  "/conversations/:conversationId",
  authenticate,
  validate([...conversationIdValidation, ...paginationValidation]),
  getConversationMessages
);

export default router;
