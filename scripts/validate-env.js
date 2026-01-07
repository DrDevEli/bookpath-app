#!/usr/bin/env node

/**
 * This script validates that all required environment variables are set
 * Run this script before starting the application in production
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define required environment variables
const REQUIRED_VARS = [
  'SESSION_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'MONGODB_URI'
];

// Define recommended environment variables
const RECOMMENDED_VARS = [
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'BOOK_API_KEY',
  'ENCRYPTION_KEY'
];

// Define security checks
const SECURITY_CHECKS = [
  {
    name: 'JWT_SECRET',
    test: (value) => value && value.length >= 32,
    message: 'JWT_SECRET should be at least 32 characters long'
  },
  {
    name: 'JWT_REFRESH_SECRET',
    test: (value) => value && value.length >= 32,
    message: 'JWT_REFRESH_SECRET should be at least 32 characters long'
  },
  {
    name: 'SESSION_SECRET',
    test: (value) => value && value.length >= 32,
    message: 'SESSION_SECRET should be at least 32 characters long'
  },
  {
    name: 'ENCRYPTION_KEY',
    test: (value) => !value || value.length >= 16,
    message: 'ENCRYPTION_KEY should be at least 16 characters long'
  }
];

// Check for missing required variables
const missingRequired = REQUIRED_VARS.filter(varName => !process.env[varName]);
if (missingRequired.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

// Check for missing recommended variables
const missingRecommended = RECOMMENDED_VARS.filter(varName => !process.env[varName]);
if (missingRecommended.length > 0) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Missing recommended environment variables:');
  missingRecommended.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
}

// Run security checks
const securityIssues = SECURITY_CHECKS
  .filter(check => !check.test(process.env[check.name]))
  .map(check => check.message);

if (securityIssues.length > 0) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Security issues detected:');
  securityIssues.forEach(message => {
    console.warn(`   - ${message}`);
  });
}

// Check for duplicate keys in .env file
try {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    const keys = new Set();
    const duplicates = new Set();
    
    envLines.forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) return;
      
      const match = line.match(/^([^=]+)=/);
      if (match) {
        const key = match[1].trim();
        if (keys.has(key)) {
          duplicates.add(key);
        } else {
          keys.add(key);
        }
      }
    });
    
    if (duplicates.size > 0) {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Duplicate keys found in .env file:');
      duplicates.forEach(key => {
        console.warn(`   - ${key}`);
      });
    }
  }
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', `❌ ERROR: Failed to check .env file: ${error.message}`);
}

// If we got here, all required variables are set
console.log('\x1b[32m%s\x1b[0m', '✅ All required environment variables are set');

// Exit with success
process.exit(0);
