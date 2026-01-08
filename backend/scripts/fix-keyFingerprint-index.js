/**
 * Migration script to fix keyFingerprint unique index
 * This script drops the old non-sparse unique index and lets Mongoose recreate it as sparse
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";

dotenv.config();

const fixIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });

    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // Get all indexes
    const indexes = await collection.indexes();
    console.log("\n📋 Current indexes:");
    indexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check if keyFingerprint_1 index exists
    const keyFingerprintIndex = indexes.find(
      (idx) => idx.name === "keyFingerprint_1"
    );

    if (keyFingerprintIndex) {
      console.log("\n🗑️  Dropping old keyFingerprint_1 index...");
      await collection.dropIndex("keyFingerprint_1");
      console.log("✅ Old index dropped successfully");
    } else {
      console.log("\n⚠️  keyFingerprint_1 index not found");
    }

    // Ensure the model is synced by calling ensureIndexes
    console.log("\n🔄 Creating new sparse index from schema...");
    await User.syncIndexes();
    console.log("✅ Schema indexes synced");

    // Verify the new index
    const newIndexes = await collection.indexes();
    const newKeyFingerprintIndex = newIndexes.find(
      (idx) => idx.name === "keyFingerprint_1"
    );

    if (newKeyFingerprintIndex) {
      console.log("\n✅ New index created:");
      console.log(`   Name: ${newKeyFingerprintIndex.name}`);
      console.log(`   Key: ${JSON.stringify(newKeyFingerprintIndex.key)}`);
      console.log(`   Unique: ${newKeyFingerprintIndex.unique}`);
      console.log(`   Sparse: ${newKeyFingerprintIndex.sparse || false}`);
      
      if (newKeyFingerprintIndex.sparse) {
        console.log("\n🎉 SUCCESS! Index is now sparse and will allow multiple null values");
      } else {
        console.log("\n⚠️  WARNING: Index is not sparse. Please check your schema.");
      }
    } else {
      console.log("\n⚠️  keyFingerprint_1 index not found after sync");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during migration:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 MongoDB connection closed");
    process.exit(0);
  }
};

// Run the migration
fixIndex();
