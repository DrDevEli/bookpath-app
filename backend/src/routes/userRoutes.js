import express from "express";
import UserController from "../controllers/userController.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /users/register — register
router.post("/register", rateLimiterMiddleware, UserController.register);
// POST /users/login — login
router.post("/login", rateLimiterMiddleware, UserController.login);

// GET /users/profile — get profile
router.get("/profile", authMiddleware(), UserController.getProfile);
// PUT /users/profile — update profile
router.put("/profile", authMiddleware(), UserController.updateProfile);
// POST /users/logout — logout
router.post("/logout", authMiddleware(), UserController.logout);

// PUT /users/password — change password
router.put("/password", authMiddleware(), UserController.changePassword);

// GET /users/preferences — get preferences
router.get("/preferences", authMiddleware(), UserController.getUserPreferences);
// PUT /users/preferences — update preferences
router.put(
  "/preferences",
  authMiddleware(),
  UserController.updateUserPreferences
);

// GET /users/notification-preferences — get notification preferences
router.get(
  "/notification-preferences",
  authMiddleware(),
  UserController.getNotificationPreferences
);
// PUT /users/notification-preferences — update notification preferences
router.put(
  "/notification-preferences",
  authMiddleware(),
  UserController.updateNotificationPreferences
);

// GET /users/data-export — export user data (GDPR)
router.get("/data-export", authMiddleware(), UserController.exportUserData);

// DELETE /users/delete-account — delete account (GDPR)
router.delete("/delete-account", authMiddleware(), UserController.deleteAccount);

export default router;
