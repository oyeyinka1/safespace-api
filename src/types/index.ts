import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface IAdmin {
  _id: string;
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  sender: 'user' | 'admin';
  content: string;
  userId?: string;
  adminId?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  _id: string;
  userId: string;
  lastMessageAt: Date;
  unreadCount: number;
  status: 'active' | 'resolved' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

export interface JWTPayload extends JwtPayload {
  id: string;
  email: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
}

export interface ConversationWithDetails extends IConversation {
  user: IUser;
  lastMessage?: IMessage;
  messages?: IMessage[];
}

export interface SocketData {
  adminId?: string;
  userId?: string;
  conversationId?: string;
}

export interface MessageData {
  conversationId: string;
  content: string;
  sender: 'user' | 'admin';
  userId?: string;
  adminId?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}