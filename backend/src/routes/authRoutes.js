import express from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { validateRequest } from "../middleware/validateRequest.js";
import { rateLimiterMiddleware } from "../middleware/rateLimiter.js";

const publicResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    message: "Too many resend attempts. Please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipFailedRequests: true, // Don't count failed requests (4xx/5xx)
});

// Controllers
import AuthController from "../controllers/authController.js";
import UserController from "../controllers/userController.js";
import { validateResetToken } from "../controllers/passwordResetController.js";
import * as emailVerificationController from "../controllers/emailVerificationController.js";

// Middleware
import {
  authMiddleware,
  generateCsrfToken,
} from "../middleware/authMiddleware.js";

// Utils
import { generateTokens } from "../utils/jwtUtils.js";

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongP@ssw0rd123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: User already exists
 */
// POST /auth/register — register
router.post(
  "/register",
  rateLimiterMiddleware,
  validateRequest,
  UserController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
// POST /auth/login — login
router.post(
  "/login",
  rateLimiterMiddleware,
  validateRequest,
  UserController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     description: Invalidate user's JWT token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
// POST /auth/logout — logout
router.post("/logout", UserController.logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh JWT token
 *     description: Get a new JWT token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
// POST /auth/refresh-token — refresh JWT
router.post("/refresh-token", AuthController.refreshTokens);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email address
 *     description: Verify user's email address using verification token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
// GET /auth/verify-email/:token — verify email
router.get("/verify-email/:token", AuthController.verifyEmail);

/**
 * @swagger
 * /auth/request-password-reset:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
// POST /auth/request-password-reset — request password reset
router.post(
  "/request-password-reset",
  rateLimiterMiddleware,
  AuthController.requestPasswordReset
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     description: Reset user's password using reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
// POST /auth/reset-password — reset password
router.post(
  "/reset-password",
  rateLimiterMiddleware,
  AuthController.resetPassword
);

// CSRF token route
// GET /auth/csrf-token — get CSRF token
router.get("/csrf-token", generateCsrfToken, (req, res) => {
  res.status(200).json({
    success: true,
    csrfToken: res.locals.csrfToken,
  });
});

// Login route
// POST /auth/login — login (passport strategy)
router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  (req, res) => {
    // Check if 2FA is enabled
    if (req.user.twoFactorEnabled) {
      return res.status(200).json({
        success: true,
        message: "Two-factor authentication required",
        data: {
          userId: req.user._id,
          requiresTwoFactor: true,
        },
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      req.user._id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  }
);

// OAuth routes
// GET /auth/google — Google OAuth start
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// GET /auth/google/callback — Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  (req, res) => {
    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(
      req.user._id,
      req.user.role
    );

    // Redirect to frontend with tokens
    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-callback?token=${accessToken}&refresh=${refreshToken}`
    );
  }
);

// Two-factor authentication routes
// POST /auth/2fa/setup — setup two-factor authentication
router.post("/2fa/setup", authMiddleware(), AuthController.setupTwoFactor);
router.post(
  // POST /auth/2fa/verify — verify and enable two-factor authentication
  "/2fa/verify",
  authMiddleware(),
  AuthController.verifyAndEnableTwoFactor
);
// POST /auth/2fa/login — verify 2FA at login
router.post("/2fa/login", AuthController.verifyTwoFactor);
// POST /auth/2fa/disable — disable two-factor authentication
router.post("/2fa/disable", authMiddleware(), AuthController.disableTwoFactor);

// Password reset routes
// POST /auth/forgot-password — request password reset (alt)
router.post("/forgot-password", AuthController.requestPasswordReset);
// GET /auth/validate-reset-token/:token — validate reset token
router.get("/validate-reset-token/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    const isValid = await validateResetToken(token);

    res.status(200).json({
      success: true,
      isValid,
    });
  } catch (error) {
    next(error);
  }
});

// Email verification
// GET /auth/verify-email/:token — send verification email (alt)
router.get(
  "/verify-email/:token",
  emailVerificationController.sendVerificationEmail
);
// POST /auth/resend-verification — resend verification email (protected)
router.post(
  "/resend-verification",
  authMiddleware(),
  emailVerificationController.resendVerificationEmailHandler
);
// POST /auth/resend-verification-public — resend verification email (public)
router.post(
  "/resend-verification-public",
  publicResendLimiter,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      await emailVerificationController.resendVerificationEmail(email);

      res.status(200).json({
        success: true,
        message:
          "If your email is registered and not verified, a verification email has been sent",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Token refresh route
// POST /auth/refresh — refresh JWT (alt)
router.post("/refresh", AuthController.refreshTokens);

// Logout route
// POST /auth/logout — logout (protected)
router.post("/logout", authMiddleware(), UserController.logout);

// Logout all sessions
// POST /auth/logout/all — logout of all sessions
router.post("/logout/all", authMiddleware(), AuthController.logoutAll);

export default router;
