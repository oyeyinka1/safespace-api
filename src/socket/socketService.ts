import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { JWTPayload } from '../types';

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Admin namespace
  const adminNamespace = io.of('/admin');

  adminNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      (socket as any).adminId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  adminNamespace.on('connection', (socket: Socket) => {
    const adminId = (socket as any).adminId;
    logger.info(`Admin connected: ${adminId} (Socket ID: ${socket.id})`);

    // Join admin room to receive all new messages
    socket.join('admin-room');

    // Join specific conversation rooms
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation-${conversationId}`);
      logger.info(`Admin ${adminId} joined conversation: ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
      logger.info(`Admin ${adminId} left conversation: ${conversationId}`);
    });

    // Handle admin typing indicator
    socket.on('typing', (data: { conversationId: string }) => {
      socket.to(`conversation-${data.conversationId}`).emit('admin-typing', {
        conversationId: data.conversationId,
      });
    });

    // Handle admin stopped typing
    socket.on('stop-typing', (data: { conversationId: string }) => {
      socket.to(`conversation-${data.conversationId}`).emit('admin-stop-typing', {
        conversationId: data.conversationId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Admin disconnected: ${adminId} (Socket ID: ${socket.id})`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for admin ${adminId}: ${error.message}`);
    });
  });

  // User namespace (public)
  const userNamespace = io.of('/user');

  userNamespace.on('connection', (socket: Socket) => {
    logger.info(`User connected (Socket ID: ${socket.id})`);

    // Join conversation room
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation-${conversationId}`);
      logger.info(`User joined conversation: ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
      logger.info(`User left conversation: ${conversationId}`);
    });

    // Handle user typing indicator
    socket.on('typing', (data: { conversationId: string }) => {
      adminNamespace.to(`conversation-${data.conversationId}`).emit('user-typing', {
        conversationId: data.conversationId,
      });
    });

    // Handle user stopped typing
    socket.on('stop-typing', (data: { conversationId: string }) => {
      adminNamespace.to(`conversation-${data.conversationId}`).emit('user-stop-typing', {
        conversationId: data.conversationId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected (Socket ID: ${socket.id})`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};