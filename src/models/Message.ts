import mongoose, { Schema, Model } from 'mongoose';
import { IMessage } from '../types';

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: String,
      required: [true, 'Conversation ID is required'],
      ref: 'Conversation',
      index: true,
    },
    sender: {
      type: String,
      required: [true, 'Sender is required'],
      enum: ['user', 'admin'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    userId: {
      type: String,
      ref: 'User',
      required: function(this: IMessage) {
        return this.sender === 'user';
      },
    },
    adminId: {
      type: String,
      ref: 'Admin',
      required: function(this: IMessage) {
        return this.sender === 'admin';
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isRead: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);

export default Message;