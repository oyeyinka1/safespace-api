import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import Admin from "../models/Admin";
import logger from "../utils/logger";
import { env } from "../config/env";

interface AdminTokenPayload {
  id: string;
  email: string;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    // Find admin with password field
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Check if admin is active
    if (!admin.isActive) {
      res.status(401).json({
        success: false,
        error: "Account is deactivated",
      });
      return;
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Generate JWT token
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET is not defined");
      res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
      return;
    }

    const payload: AdminTokenPayload = {
      id: admin._id.toString(),
      email: admin.email,
    };
    const signOptions: SignOptions = {
      expiresIn: "7d",
    };
    const token = jwt.sign(payload, jwtSecret, signOptions);

    logger.info(`Admin logged in: ${admin.email}`);

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
        },
      },
      message: "Login successful",
    });
  } catch (error: any) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = (req as any).admin.id;

    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      res.status(404).json({
        success: false,
        error: "Admin not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        isActive: admin.isActive,
      },
    });
  } catch (error: any) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
};
