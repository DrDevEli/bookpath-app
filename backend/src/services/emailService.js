// External dependencies
import nodemailer from "nodemailer";
import { getEnvConfig } from "../utils/envValidator.js";
import logger from "../config/logger.js";

//  Load configuration from environment variables using a safe validator
const emailConfig = getEnvConfig({
  SMTP_HOST: { default: "" },
  SMTP_PORT: { type: "number", default: 587 },
  SMTP_USER: { default: "" },
  SMTP_PASS: { default: "" },
  EMAIL_FROM: { default: "noreply@bookpath.org" },
  FRONTEND_URL: { default: process.env.FRONTEND_URL || process.env.SITE_URL || "http://localhost:3000" },
  NODE_ENV: { default: "development" },
});

// Email transporter instance (will be created on app startup)
let transporter;

/**
 * Initialize the email transporter once
 * - In development: disables actual email sending
 * - In production: uses SMTP credentials
 */
async function initializeTransporter() {
  try {
    if (emailConfig.NODE_ENV === "development" || !emailConfig.SMTP_HOST) {
      // Create a fake transporter that logs instead of sending emails.
      // Also used in production when SMTP_HOST is unset — avoids creating a
      // broken transporter (empty host) that would throw on every send.
      transporter = {
        sendMail: () => {
          logger.info("📨 Email sending disabled in development mode");
          return Promise.resolve({
            messageId: "mock-message-id",
            accepted: [],
            rejected: [],
            envelopeTime: 0,
            messageTime: 0,
            response: "250 Email disabled in development",
          });
        },
      };
      logger.info("📧 Email service running in development mode");
    } else {
      // Create a real SMTP transporter
      transporter = nodemailer.createTransport({
        host: emailConfig.SMTP_HOST,
        port: emailConfig.SMTP_PORT,
        secure: emailConfig.SMTP_PORT === 465, // true if port is 465
        auth: {
          user: emailConfig.SMTP_USER,
          pass: emailConfig.SMTP_PASS,
        },
      });

      logger.info("📬 Email transporter initialized with SMTP settings");
    }

    // Only call verify if available (not in mock mode)
    if (typeof transporter.verify === "function") {
      await transporter.verify();
      logger.info("✅ Email service is ready");
    }

    return true;
  } catch (error) {
    logger.error("❌ Failed to initialize email service", {
      error: error.message,
    });
    return false;
  }
}

/**
 *  Generic method to send an email
 * - Handles fallback, logging and error tracking
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!transporter) await initializeTransporter();

    const mailOptions = {
      from: `"BookPath" <${emailConfig.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info("📨 Email sent successfully", {
      messageId: info.messageId,
      to,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error("❌ Failed to send email", {
      error: error.message,
      to,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 *  Send a verification email after registration
 * - Includes a verification link
 */
async function sendVerificationEmail(email, token, username) {
  const verificationUrl = `${emailConfig.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <h2>Verify Your Email</h2>
    <p>Hello ${username},</p>
    <p>Click below to verify your email:</p>
    <a href="${verificationUrl}">${verificationUrl}</a>
    <p>This link expires in 24 hours.</p>
  `;

  const text = `Hello ${username}, verify your email using this link: ${verificationUrl}`;

  return sendEmail({
    to: email,
          subject: "Verify Your Email - BookPath",
    html,
    text,
  });
}

/**
 *  Send a password reset email
 * - Used when users request to reset password
 */
async function sendPasswordResetEmail(email, token, username) {
  const resetUrl = `${emailConfig.FRONTEND_URL}/reset-password/${token}`;

  const html = `
    <h2>Reset Your Password</h2>
    <p>Hello ${username},</p>
    <p>Click below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link expires in 1 hour.</p>
  `;

  const text = `Reset password link: ${resetUrl}`;

  return sendEmail({
    to: email,
    subject: "Reset Your Password - BookPath",
    html,
    text,
  });
}

/**
 *  Send a welcome email after a user subscribes to the deals/reactivation list.
 *  Non-critical: callers should fire-and-forget and tolerate failure (no-op
 *  when SMTP is unconfigured — the mock transporter logs instead of sending).
 */
async function sendWelcomeEmail(email) {
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
      <h2 style="margin:0 0 12px">Welcome to BookPath 📚</h2>
      <p>You're on the list. We'll email you when we spot genuinely good book
         deals and recommendations in the genres you care about.</p>
      <p>No spam, ever — just curated finds worth your time. You can unsubscribe
         with one click on any email.</p>
      <p style="color:#6b7280;font-size:13px">— The BookPath team</p>
    </div>
  `;
  const text =
    "Welcome to BookPath! You're on the list — we'll email you curated book deals " +
    "and recommendations in the genres you care about. No spam, ever.";

  return sendEmail({
    to: email,
    subject: "Welcome to BookPath — you're on the list",
    html,
    text,
  });
}

// initialize transporter on import (can be moved to app startup)
initializeTransporter();

// Export the functions used in the rest of the app
export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
