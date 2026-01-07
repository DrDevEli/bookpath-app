import mongoose from "mongoose";
import logger from "../config/logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
    });

    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB initial connection error", { error: error.message });
    process.exit(1);
  }

  // Connection event handlers
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected - attempting to reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", { error: error.message });
  });

  mongoose.connection.on("reconnectFailed", () => {
    logger.error("MongoDB reconnection failed - giving up");
    process.exit(1);
  });
};

export default connectDB;
