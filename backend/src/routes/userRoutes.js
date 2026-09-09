import express from "express";
import UserController from "../controllers/userController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
} from "../middleware/validateRequest.js";

const router = express.Router();

// Public routes (Joi mirrors authRoutes — /api/users/* are live duplicates,
// so weak passwords must 400 here too, not 500 via the mongoose validator).
router.post("/register", rateLimiterMiddleware, validateUserRegistration, UserController.register);
router.post("/login", rateLimiterMiddleware, validateUserLogin, UserController.login);

// Protected routes (require authentication)
router.get("/profile", authMiddleware(), UserController.getProfile);
router.put("/profile", authMiddleware(), validateUserUpdate, UserController.updateProfile);
router.post("/logout", authMiddleware(), UserController.logout);

// Password management
router.put("/password", authMiddleware(), validatePasswordChange, UserController.changePassword);

// User preferences
router.get("/preferences", authMiddleware(), UserController.getUserPreferences);
router.put(
  "/preferences",
  authMiddleware(),
  UserController.updateUserPreferences
);

export default router;
