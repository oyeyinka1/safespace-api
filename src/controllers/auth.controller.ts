import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import Admin from "../models/Admin";
import User from "../models/User";
import logger from "../utils/logger";
import { env } from "../config/env";

interface TokenPayload {
  id: string;
  email: string;
  role: "admin" | "user";
}

const generateToken = (payload: TokenPayload): string => {
  const jwtSecret = env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const signOptions: SignOptions = {
    expiresIn: "7d",
  };

  return jwt.sign(payload, jwtSecret, signOptions);
};

//
// ==========================
// ADMIN LOGIN
// ==========================
//
export const adminLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    const isValid = await admin.comparePassword(password);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    const token = generateToken({
      id: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });

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
    });
  } catch (error: any) {
    logger.error(`Admin login error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};

//
// ==========================
// USER REGISTER
// ==========================
//
export const userRegister = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: "Name, email and password are required",
      });
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "Email already registered",
      });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      isActive: true,
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: "user",
    });

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
      message: "Registration successful",
    });
  } catch (error: any) {
    logger.error(`User register error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
};

//
// ==========================
// USER LOGIN
// ==========================
//
export const userLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    const isValid = await user.comparePassword(password);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: "user",
    });

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
      message: "Login successful",
    });
  } catch (error: any) {
    logger.error(`User login error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};

//
// ==========================
// GET PROFILE (ADMIN OR USER)
// ==========================
//
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authUser = (req as any).user; // set by auth middleware

    if (!authUser) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    if (authUser.role === "admin") {
      const admin = await Admin.findById(authUser.id).select("-password");

      if (!admin) {
        res.status(404).json({
          success: false,
          error: "Admin not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: admin,
      });

      return;
    }

    if (authUser.role === "user") {
      const user = await User.findById(authUser.id).select("-password");

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });

      return;
    }
  } catch (error: any) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
};
