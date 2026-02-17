import express, { Application } from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import connectDB from "./src/config/db";
import logger from "./src/utils/logger";
import { initializeSocket } from "./src/socket/socketService";
import { env } from "process";
import { notFound, errorHandler } from "./src/middleware/errorHandler.middleware";
import { apiLimiter } from "./src/middleware/rateLimiter.middleware";
import authRoutes from "./src/routes/auth.routes";
import messageRoutes from "./src/routes/message.routes";


// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible in routes
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// Connect to database
connectDB();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development, configure for production
  })
);

app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500", "https://safespace-daily.vercel.app"],
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url} ${res.statusCode}`);
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", apiLimiter, messageRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Safespace API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      messages: "/api/messages",
      health: "/health",
    },
  });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
  logger.info(
    `CORS enabled for origin: ${
      process.env.CORS_ORIGIN || "http://localhost:5500"
    }`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Process terminated");
  });
});

export default app;
