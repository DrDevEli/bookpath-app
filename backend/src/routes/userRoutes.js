import express from "express";
import UserController from "../controllers/userController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", rateLimiterMiddleware, UserController.register);
router.post("/login", rateLimiterMiddleware, UserController.login);

// Protected routes (require authentication)
router.get("/profile", authMiddleware(), UserController.getProfile);
router.put("/profile", authMiddleware(), UserController.updateProfile);
router.post("/logout", authMiddleware(), UserController.logout);

// Password management
router.put("/password", authMiddleware(), UserController.changePassword);

// User preferences
router.get("/preferences", authMiddleware(), UserController.getUserPreferences);
router.put(
  "/preferences",
  authMiddleware(),
  UserController.updateUserPreferences
);

export default router;
