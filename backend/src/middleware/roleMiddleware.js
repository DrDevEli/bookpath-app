import { ApiError } from "../utils/errors.js";
import User from "../models/User.js";

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError("Unauthorized", 401));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError("Insufficient permissions", 403));
    }
    next();
  };
}

export function requireTier(...allowedTiers) {
  return async (req, _res, next) => {
    if (!req.user) return next(new ApiError("Unauthorized", 401));
    const user = await User.findById(req.user.id).select("subscriptionTier");
    if (!user) return next(new ApiError("User not found", 404));
    if (!allowedTiers.includes(user.subscriptionTier)) {
      return next(new ApiError("Subscription required", 402));
    }
    next();
  };
}

export const adminOnly = requireRole("chefaodacasa");
export const userOnly = requireRole("user", "chefaodacasa");
export const proOnly = requireTier("pro");


