import mongoose, { Schema, Model } from 'mongoose';
import { IConversation } from '../types';

const conversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User',
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
conversationSchema.index({ userId: 1, status: 1 });
conversationSchema.index({ lastMessageAt: -1, status: 1 });
conversationSchema.index({ status: 1, unreadCount: -1 });

const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
);

export default Conversation;