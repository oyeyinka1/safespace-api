import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { JWTPayload } from "../types";
import Conversation from "../models/Conversation";

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: ["http://localhost:5500", "http://127.0.0.1:5500", "https://safespace-daily.vercel.app"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  const authenticateSocket = (expectedRole: "admin" | "user") => {
    return (socket: Socket, next: any) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

        if (decoded.role !== expectedRole) {
          return next(new Error("Authorization error: Invalid role"));
        }

        (socket as any).user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };

        next();
      } catch (error) {
        next(new Error("Authentication error: Invalid token"));
      }
    };
  };

  // Admin namespace
  const adminNamespace = io.of("/admin");

  adminNamespace.use(authenticateSocket("admin"));

  adminNamespace.on("connection", (socket: Socket) => {
    const adminId = (socket as any).user.id;
    logger.info(`Admin connected: ${adminId} (Socket ID: ${socket.id})`);

    // Join admin room to receive all new messages
    socket.join("admin-room");

    // Join specific conversation rooms
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation-${conversationId}`);
      logger.info(`Admin ${adminId} joined conversation: ${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
      logger.info(`Admin ${adminId} left conversation: ${conversationId}`);
    });

    // Handle admin typing indicator
    socket.on("typing", (data: { conversationId: string }) => {
      socket.to(`conversation-${data.conversationId}`).emit("admin-typing", {
        conversationId: data.conversationId,
      });
    });

    // Handle admin stopped typing
    socket.on("stop-typing", (data: { conversationId: string }) => {
      socket
        .to(`conversation-${data.conversationId}`)
        .emit("admin-stop-typing", {
          conversationId: data.conversationId,
        });
    });

    socket.on("disconnect", () => {
      logger.info(`Admin disconnected: ${adminId} (Socket ID: ${socket.id})`);
    });

    socket.on("error", (error) => {
      logger.error(`Socket error for admin ${adminId}: ${error.message}`);
    });
  });

  // User namespace (public)
  const userNamespace = io.of("/user");
  
  userNamespace.use(authenticateSocket("user"));

  userNamespace.on("connection", (socket: Socket) => {
    const userId = (socket as any).user.id;

    logger.info(`User connected ${userId}`);

    // Join conversation room
    socket.on("join-conversation", async (conversationId: string) => {
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) return;

      if (conversation.userId.toString() !== userId) {
        logger.warn(`Unauthorized join attempt by user ${userId}`);
        return;
      }

      socket.join(`conversation-${conversationId}`);
    });

    // Leave conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
      logger.info(`User left conversation: ${conversationId}`);
    });

    // Handle user typing indicator
    socket.on("typing", (data: { conversationId: string }) => {
      adminNamespace
        .to(`conversation-${data.conversationId}`)
        .emit("user-typing", {
          conversationId: data.conversationId,
        });
    });

    // Handle user stopped typing
    socket.on("stop-typing", (data: { conversationId: string }) => {
      adminNamespace
        .to(`conversation-${data.conversationId}`)
        .emit("user-stop-typing", {
          conversationId: data.conversationId,
        });
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected (Socket ID: ${socket.id})`);
    });

    socket.on("error", (error) => {
      logger.error(`Socket error: ${error.message}`);
    });
  });

  logger.info("Socket.IO initialized successfully");
  return io;
};
