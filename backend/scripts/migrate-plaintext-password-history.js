// C1 migration — hash plaintext passwordHistory entries + revoke all tokens.
// Runs against the RAW collection (mongoose projection was dropping the array
// in some select combinations). Uses the same bcryptjs the app uses.
// Prints COUNTS ONLY, never values. Idempotent: bcrypt entries are skipped.
// Usage: node scripts/migrate-plaintext-password-history.js
import "./loadEnv.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_RE = /^\$2[aby]\$/;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const coll = mongoose.connection.db.collection("users");

  const affected = await coll
    .find({ passwordHistory: { $exists: true, $ne: [] } })
    .project({ passwordHistory: 1 })
    .toArray();

  let plaintextEntries = 0;
  let hashedEntries = 0;
  let updated = 0;
  const now = Date.now();

  for (const user of affected) {
    const history = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
    const next = [];
    let changed = false;

    for (const entry of history) {
      const raw = entry && typeof entry.hash === "string" ? entry.hash : "";
      if (raw && !BCRYPT_RE.test(raw)) {
        const hashed = await bcrypt.hash(raw, 12);
        next.push({
          hash: hashed,
          changedAt: entry.changedAt ? new Date(entry.changedAt) : new Date(),
        });
        plaintextEntries++;
        changed = true;
      } else {
        if (entry) {
          next.push(entry);
          if (raw) hashedEntries++;
        }
      }
    }

    if (changed) {
      // Revoke every outstanding session: any token issued before now embeds
      // an older tokenVersion and is rejected by the deployed authMiddleware.
      await coll.updateOne(
        { _id: user._id },
        { $set: { passwordHistory: next, tokenVersion: now } }
      );
      updated++;
    }
  }

  console.log(
    JSON.stringify({
      scanned: affected.length,
      updated,
      plaintextEntriesHashed: plaintextEntries,
      alreadyHashedEntries: hashedEntries,
      tokenVersionRevokedAt: new Date(now).toISOString(),
    })
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err.message);
  process.exit(1);
});
