// External dependencies
import nodemailer from "nodemailer";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { getEnvConfig } from "../utils/envValidator.js";
import logger from "../config/logger.js";

//  Load configuration from environment variables using a safe validator
const emailConfig = getEnvConfig({
  SMTP_HOST: { default: "" },
  SMTP_PORT: { type: "number", default: 587 },
  SMTP_USER: { default: "" },
  SMTP_PASS: { default: "" },
  FRONTEND_URL: { default: "http://localhost:3000" },
  NODE_ENV: { default: "development" },
  EMAIL_PROVIDER: { default: "smtp" }, // "smtp" | "ses"
  SES_SENDER_EMAIL: { default: "" },
  AWS_REGION: { default: process.env.AWS_REGION || "us-east-1" },
});

// Email transporter instance (will be created on app startup)
let transporter;
let sesClient;

/**
 * Initialize the email transporter once
 * - In development: disables actual email sending
 * - In production: uses SMTP credentials
 */
async function initializeTransporter() {
  try {
    if (emailConfig.NODE_ENV === "development") {
      // Create a fake transporter that logs instead of sending emails
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
    } else if (emailConfig.EMAIL_PROVIDER === "smtp") {
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
    } else if (emailConfig.EMAIL_PROVIDER === "ses") {
      // Initialize AWS SES client; credentials/region are taken from env or shared config
      sesClient = new SESClient({ region: emailConfig.AWS_REGION });
      logger.info("📬 SES client initialized", { region: emailConfig.AWS_REGION });
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
    const senderAddress = emailConfig.EMAIL_PROVIDER === "ses"
      ? (emailConfig.SES_SENDER_EMAIL || "noreply@bookpath.eu")
      : (emailConfig.SMTP_USER || "noreply@bookpath.eu");

    if (emailConfig.EMAIL_PROVIDER === "ses" && emailConfig.NODE_ENV !== "development") {
      if (!sesClient) {
        sesClient = new SESClient({ region: emailConfig.AWS_REGION });
      }

      const command = new SendEmailCommand({
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: html ? { Data: html, Charset: "UTF-8" } : undefined,
            Text: { Data: text || "", Charset: "UTF-8" },
          },
        },
        Source: senderAddress,
      });

      const result = await sesClient.send(command);

      logger.info("📨 Email sent successfully via SES", {
        messageId: result?.MessageId,
        to,
      });

      return {
        success: true,
        messageId: result?.MessageId,
      };
    }

    // Default to SMTP transporter (or dev mock)
    const mailOptions = {
      from: `"BookPath API" <${senderAddress}>`,
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

// initialize transporter on import (can be moved to app startup)
initializeTransporter();

// Export the functions used in the rest of the app
export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
