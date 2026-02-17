import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import User from "../models/User";

export const requireUser = async (
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

  if (req.user.role !== "user") {
    res.status(403).json({
      success: false,
      error: "User access required",
    });
    return;
  }

  const user = await User.findById(req.user.id);

  if (!user || !user.isActive) {
    res.status(403).json({
      success: false,
      error: "User account not active",
    });
    return;
  }

  next();
};
