import { Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

export const submitMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { message } = req.body;
    const userId = req.user!.id;

    if (!message) {
      res.status(400).json({
        success: false,
        error: "Message content is required",
      });
      return;
    }

    // Find active conversation
    let conversation = await Conversation.findOne({
      userId,
      status: { $in: ["active", "resolved"] },
    });

    // Create if none exists
    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        status: "active",
        lastMessageAt: new Date(),
        unreadCount: 0,
      });
    }

    // Reopen if resolved
    if (conversation.status === "resolved") {
      conversation.status = "active";
    }

    conversation.lastMessageAt = new Date();
    conversation.unreadCount += 1;
    await conversation.save();

    // Create message
    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: "user",
      content: message,
      userId,
      isRead: false,
    });

    logger.info(`User ${userId} sent message ${newMessage._id}`);

    // Emit to admin room
    const io = (req as any).io;
    if (io) {
      io.of("/admin").io.to("admin-room").emit("new-message", {
        conversationId: conversation._id,
        message: newMessage,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation._id,
        message: newMessage,
      },
    });
  } catch (error: any) {
    logger.error(`Submit message error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to submit message",
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

export const getUserConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const conversations = await Conversation.find({ userId })
      .sort({ lastMessageAt: -1 })
      .populate("userId", "name email")
      .lean();

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    logger.error(`Get user conversations error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversations",
    });
  }
};


export const getConversationMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { role, id } = req.user!;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
      return;
    }

    // Ownership check
    if (role === "user" && conversation.userId.toString() !== id) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
      });
      return;
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error: any) {
    logger.error(`Get messages error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
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
    const { role, id: adminId } = req.user!;

    if (role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Admins only",
      });
      return;
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
      return;
    }

    const newMessage = await Message.create({
      conversationId,
      sender: "admin",
      content: message,
      adminId,
      isRead: false,
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    logger.info(`Admin ${adminId} replied to ${conversationId}`);

    const io = (req as any).io;
    if (io) {
      io.to(`conversation-${conversationId}`).emit("admin-reply", {
        message: newMessage,
      });
    }

    res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (error: any) {
    logger.error(`Send reply error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to send reply",
    });
  }
};


export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { role, id } = req.user!;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
      return;
    }

    if (role === "user" && conversation.userId.toString() !== id) {
      res.status(403).json({
        success: false,
        error: "Forbidden",
      });
      return;
    }

    const senderToMark = role === "admin" ? "user" : "admin";

    await Message.updateMany(
      {
        conversationId,
        sender: senderToMark,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error: any) {
    logger.error(`Mark as read error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to mark messages",
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
    const { role } = req.user!;

    if (role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Admins only",
      });
      return;
    }

    if (!["active", "resolved", "archived"].includes(status)) {
      res.status(400).json({
        success: false,
        error: "Invalid status",
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
        error: "Conversation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    logger.error(`Update status error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to update status",
    });
  }
};
