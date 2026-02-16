import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import Admin from "../models/Admin";

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      error: "Admin access required",
    });
    return;
  }

  // Optional: verify admin still exists + active
  const admin = await Admin.findById(req.user.id);

  if (!admin || !admin.isActive) {
    res.status(403).json({
      success: false,
      error: "Admin account not active",
    });
    return;
  }

  next();
};
