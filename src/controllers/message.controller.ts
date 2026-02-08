import { Request, Response } from 'express';
import User from '../models/User';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

export const submitMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, message } = req.body;

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        name,
        phone,
        email: email || undefined,
      });
      logger.info(`New user created: ${user._id}`);
    } else {
      // Update user info if provided
      user.name = name;
      if (email) user.email = email;
      await user.save();
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      userId: user._id.toString(),
      status: { $in: ['active', 'resolved'] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        userId: user._id.toString(),
        lastMessageAt: new Date(),
        unreadCount: 1,
        status: 'active',
      });
      logger.info(`New conversation created: ${conversation._id}`);
    } else {
      // Reopen conversation if it was resolved
      if (conversation.status === 'resolved') {
        conversation.status = 'active';
      }
      conversation.lastMessageAt = new Date();
      conversation.unreadCount += 1;
      await conversation.save();
    }

    // Create message
    const newMessage = await Message.create({
      conversationId: conversation._id.toString(),
      sender: 'user',
      content: message,
      userId: user._id.toString(),
      isRead: false,
    });

    logger.info(`Message created: ${newMessage._id} from user: ${user._id}`);

    // Emit socket event (handled in socket service)
    const io = (req as any).io;
    if (io) {
      io.to('admin-room').emit('new-message', {
        conversationId: conversation._id.toString(),
        message: {
          _id: newMessage._id,
          conversationId: newMessage.conversationId,
          sender: newMessage.sender,
          content: newMessage.content,
          userId: newMessage.userId,
          isRead: newMessage.isRead,
          createdAt: newMessage.createdAt,
        },
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation._id,
        messageId: newMessage._id,
        user: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
        },
      },
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    logger.error(`Submit message error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to submit message',
    });
  }
};

export const getConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status && ['active', 'resolved', 'archived'].includes(status)) {
      query.status = status;
    }

    // Get conversations with pagination
    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user details and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv.userId).lean();
        const lastMessage = await Message.findOne({
          conversationId: conv._id.toString(),
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...conv,
          user,
          lastMessage,
        };
      })
    );

    const total = await Conversation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        conversations: conversationsWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Get conversations error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
    });
  }
};

export const getConversationMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({ conversationId });

    // Get user details
    const user = await User.findById(conversation.userId).lean();

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          ...conversation.toObject(),
          user,
        },
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Get messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
};

export const sendAdminReply = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const adminId = req.admin!.id;

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Create admin message
    const newMessage = await Message.create({
      conversationId,
      sender: 'admin',
      content: message,
      adminId,
      isRead: false,
    });

    // Update conversation
    conversation.lastMessageAt = new Date();
    await conversation.save();

    logger.info(`Admin reply sent: ${newMessage._id} to conversation: ${conversationId}`);

    // Get user details for socket emission
    const user = await User.findById(conversation.userId).lean();
    console.log("user:", user)

    // Emit socket event to user
    const io = (req as any).io;
    if (io) {
      io.to(`conversation-${conversationId}`).emit('admin-reply', {
        message: {
          _id: newMessage._id,
          conversationId: newMessage.conversationId,
          sender: newMessage.sender,
          content: newMessage.content,
          adminId: newMessage.adminId,
          isRead: newMessage.isRead,
          createdAt: newMessage.createdAt,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        message: newMessage,
      },
      message: 'Reply sent successfully',
    });
  } catch (error: any) {
    logger.error(`Send reply error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to send reply',
    });
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversationId,
        sender: 'user',
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    // Reset unread count
    conversation.unreadCount = 0;
    await conversation.save();

    logger.info(`Conversation ${conversationId} marked as read`);

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    logger.error(`Mark as read error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
    });
  }
};

export const updateConversationStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!['active', 'resolved', 'archived'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, resolved, or archived',
      });
      return;
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { status },
      { new: true }
    );

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    logger.info(`Conversation ${conversationId} status updated to ${status}`);

    res.status(200).json({
      success: true,
      data: conversation,
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    logger.error(`Update status error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
    });
  }
};