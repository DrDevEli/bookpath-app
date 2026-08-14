/**
 * Env loader for standalone scripts.
 *
 * ES-module static imports are hoisted and evaluated BEFORE top-level code, so
 * a plain `dotenv.config()` in the script body runs too late — redis.js and
 * amazonAffiliateService read process.env at import time and would see unset
 * vars (mock Redis, no affiliate tag).
 *
 * Importing this module FIRST fixes the order: its dotenv.config() runs before
 * every subsequent import's module-level code.
 *
 *   import "./loadEnv.js";   // MUST be the first import
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/.env (this file lives at backend/scripts/loadEnv.js)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
