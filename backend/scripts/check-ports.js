import net from "net";
import mongoose from "mongoose";
import redis from "../src/config/redis.js";
import dotenv from "dotenv";

dotenv.config();

const ports = {
  backend: process.env.PORT || 3001,
  frontend: process.env.FRONTEND_PORT || 3000,
  mongodb: process.env.MONGODB_PORT || 27017,
  redis: process.env.REDIS_PORT || 17046,
};

const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(true); // Port is in use
    });
    server.once("listening", () => {
      server.close();
      resolve(false); // Port is available
    });
    server.listen(port);
  });
};

const checkMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connection successful");
    await mongoose.connection.close();
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message);
  }
};

const checkRedis = async () => {
  try {
    await redis.ping();
    console.log("✅ Redis connection successful");
  } catch (error) {
    console.log("❌ Redis connection failed:", error.message);
  }
};

const main = async () => {
  console.log("🔍 Checking ports and connections...\n");

  // Check ports
  for (const [service, port] of Object.entries(ports)) {
    const isInUse = await checkPort(port);
    console.log(
      `${isInUse ? "✅" : "❌"} Port ${port} (${service}) is ${
        isInUse ? "in use" : "available"
      }`
    );
  }

  console.log("\n🔍 Checking database connections...\n");

  // Check MongoDB
  await checkMongoDB();

  // Check Redis
  await checkRedis();

  process.exit(0);
};

main().catch(console.error);
