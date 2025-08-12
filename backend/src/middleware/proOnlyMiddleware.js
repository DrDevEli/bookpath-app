import { ApiError } from "../utils/errors.js";

/**
 * Middleware to check if user has Pro subscription
 */
export const proOnly = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError("Authentication required", 401));
  }

  if (req.user.subscriptionTier !== "pro") {
    return next(new ApiError("Pro subscription required", 402));
  }

  next();
};

/**
 * Middleware to check if user has Pro subscription or allow limited access
 * @param {Object} options - Configuration options
 * @param {number} options.freeLimit - Maximum items allowed for free users
 * @param {string} options.feature - Feature name for error message
 */
export const proOrLimited = (options = {}) => {
  const { freeLimit = 5, feature = "feature" } = options;
  
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError("Authentication required", 401));
    }

    // Pro users get unlimited access
    if (req.user.subscriptionTier === "pro") {
      req.isProUser = true;
      return next();
    }

    // Free users get limited access
    req.isProUser = false;
    req.freeLimit = freeLimit;
    req.featureName = feature;
    
    next();
  };
};