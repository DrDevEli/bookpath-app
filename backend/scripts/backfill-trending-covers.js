// One-off: backfill missing coverImage on existing affiliate click events.
// Reuses the app's own getGoogleBookById so the stored URL matches exactly what
// the detail page serves (API key + transformGoogleBook cover preference).
import "./loadEnv.js"; // MUST be first — loads backend/.env before other imports
import mongoose from "mongoose";
import AnalyticsEvent from "../src/models/AnalyticsEvent.js";
import { getGoogleBookById } from "../src/services/googleBooksService.js";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI not set");

await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 5000 });

const clicks = await AnalyticsEvent.find({
  type: "click",
  $or: [{ coverImage: null }, { coverImage: { $exists: false } }],
});

let updated = 0;
for (const c of clicks) {
  const volumeId = c.bookId && c.bookId.startsWith("google-") ? c.bookId.slice(7) : null;
  if (!volumeId) {
    console.log(`SKIP  ${c.bookTitle} (no google- volume id: ${c.bookId})`);
    continue;
  }
  try {
    const gb = await getGoogleBookById(volumeId);
    if (gb && gb.coverImage) {
      c.coverImage = gb.coverImage;
      await c.save();
      updated++;
      console.log(`OK    ${c.bookTitle} -> ${gb.coverImage.slice(0, 80)}...`);
    } else {
      console.log(`NONE  ${c.bookTitle} (no cover in Google Books)`);
    }
  } catch (e) {
    console.log(`ERR   ${c.bookTitle}: ${e.message}`);
  }
}

console.log(`\ndone: ${updated}/${clicks.length} events updated`);
await mongoose.connection.close();
