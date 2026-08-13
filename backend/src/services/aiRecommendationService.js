import OpenAI from "openai";
import BookCollection from "../models/BookCollection.js";
import { cache } from "../utils/cache.js";
import logger from "../config/logger.js";

const CACHE_KEY_PREFIX = "ai-recommendations:";
const CACHE_TTL = 24 * 60 * 60; // 24 hours

// OpenAI client configuration — read lazily to allow dotenv to load first
function getOpenAIKey() {
  return process.env.OPENAI_API_KEY;
}
function getOpenAIBaseURL() {
  return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
}

let openaiClient = null;

/**
 * Get or initialize the OpenAI client
 * @returns {OpenAI} OpenAI client instance
 */
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Please set it in your .env file."
      );
    }
    openaiClient = new OpenAI({
      apiKey,
      baseURL: getOpenAIBaseURL(),
    });
  }
  return openaiClient;
}

/**
 * Aggregate all books from a user's collections into a reading profile
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Aggregated reading profile
 */
async function getUserReadingProfile(userId) {
  const collections = await BookCollection.find({ user: userId }).lean();

  if (!collections || collections.length === 0) {
    return {
      totalBooks: 0,
      booksRead: [],
      favoriteBooks: [],
      authors: [],
      genres: [],
      readStatusCounts: {},
    };
  }

  // Aggregate all books from all collections
  const allBooks = [];
  const seenBookIds = new Set();

  for (const collection of collections) {
    for (const book of collection.books) {
      if (!seenBookIds.has(book.bookId)) {
        seenBookIds.add(book.bookId);
        allBooks.push(book);
      }
    }
  }

  // Extract reading profile
  const booksRead = allBooks
    .filter((b) => b.readStatus === "completed")
    .map((b) => ({
      title: b.title,
      authors: b.authors || [],
      genres: b.genres || [],
      rating: b.rating || null,
      favorite: b.favorite || false,
      personalTags: b.personalTags || [],
    }));

  const favoriteBooks = allBooks
    .filter((b) => b.favorite)
    .map((b) => ({
      title: b.title,
      authors: b.authors || [],
      genres: b.genres || [],
      rating: b.rating || null,
    }));

  // Aggregate unique authors
  const authorSet = new Set();
  allBooks.forEach((b) => {
    (b.authors || []).forEach((a) => authorSet.add(a));
  });
  const authors = [...authorSet];

  // Aggregate genres
  const genreMap = {};
  allBooks.forEach((b) => {
    (b.genres || []).forEach((g) => {
      genreMap[g] = (genreMap[g] || 0) + 1;
    });
  });
  const genres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));

  // Read status counts
  const readStatusCounts = {};
  allBooks.forEach((b) => {
    const status = b.readStatus || "to-read";
    readStatusCounts[status] = (readStatusCounts[status] || 0) + 1;
  });

  // Currently reading
  const currentlyReading = allBooks
    .filter((b) => b.readStatus === "reading")
    .map((b) => ({
      title: b.title,
      authors: b.authors || [],
      genres: b.genres || [],
    }));

  // DNF/abandoned (books the user didn't like)
  const didNotFinish = allBooks
    .filter((b) => b.readStatus === "dnf" || b.readStatus === "abandoned")
    .map((b) => ({
      title: b.title,
      authors: b.authors || [],
      genres: b.genres || [],
    }));

  return {
    totalBooks: allBooks.length,
    completedCount: booksRead.length,
    booksRead,
    favoriteBooks,
    currentlyReading,
    didNotFinish,
    authors,
    genres,
    readStatusCounts,
    personalTags: [
      ...new Set(allBooks.flatMap((b) => b.personalTags || [])),
    ],
  };
}

/**
 * Build the prompt for OpenAI based on the user's reading profile
 * @param {Object} profile - User's reading profile
 * @returns {string} Formatted prompt
 */
function buildRecommendationPrompt(profile) {
  let prompt = `You are a knowledgeable book recommendation engine. Based on the user's reading history, suggest 5 books they would love. Be specific and thoughtful.

USER READING PROFILE:
- Total books in library: ${profile.totalBooks}
- Completed: ${profile.completedCount}
- Currently reading: ${profile.currentlyReading.length}
- DNF/Abandoned: ${profile.didNotFinish.length}
`;

  if (profile.favoriteBooks.length > 0) {
    prompt += `\nFAVORITE BOOKS:\n`;
    profile.favoriteBooks.forEach((b) => {
      prompt += `- "${b.title}" by ${b.authors.join(", ")} (genres: ${b.genres.join(", ") || "none"})\n`;
    });
  }

  if (profile.booksRead.length > 0) {
    prompt += `\nCOMPLETED BOOKS:\n`;
    // Limit to 20 to avoid token limits
    profile.booksRead.slice(0, 20).forEach((b) => {
      prompt += `- "${b.title}" by ${b.authors.join(", ")} (genres: ${b.genres.join(", ") || "none"}, rating: ${b.rating || "N/A"})\n`;
    });
    if (profile.booksRead.length > 20) {
      prompt += `  (... and ${profile.booksRead.length - 20} more)\n`;
    }
  }

  if (profile.currentlyReading.length > 0) {
    prompt += `\nCURRENTLY READING:\n`;
    profile.currentlyReading.forEach((b) => {
      prompt += `- "${b.title}" by ${b.authors.join(", ")}\n`;
    });
  }

  if (profile.didNotFinish.length > 0) {
    prompt += `\nDID NOT FINISH (avoid similar):\n`;
    profile.didNotFinish.forEach((b) => {
      prompt += `- "${b.title}" by ${b.authors.join(", ")} (genres: ${b.genres.join(", ") || "none"})\n`;
    });
  }

  if (profile.genres.length > 0) {
    prompt += `\nTOP GENRES:\n`;
    profile.genres.slice(0, 10).forEach((g) => {
      prompt += `- ${g.genre} (${g.count} books)\n`;
    });
  }

  if (profile.authors.length > 0) {
    prompt += `\nAUTHORS IN LIBRARY:\n`;
    prompt += profile.authors.slice(0, 15).join(", ");
    if (profile.authors.length > 15) {
      prompt += ` (and ${profile.authors.length - 15} more)`;
    }
    prompt += `\n`;
  }

  if (profile.personalTags.length > 0) {
    prompt += `\nUSER'S PERSONAL TAGS: ${profile.personalTags.join(", ")}\n`;
  }

  prompt += `\nRECOMMEND 5 BOOKS that this user would genuinely enjoy. For each recommendation, consider:
1. Similar genres and themes to their favorites
2. Authors with similar style to ones they loved
3. Books that expand on their interests
4. Avoid books similar to ones they DNF'd
5. Factor in their rating patterns (highly rated = similar quality)

Return your response as a valid JSON array of 5 objects with these exact fields:
- "title": (string) The book title
- "authors": (array of strings) Author name(s)
- "reason": (string) A personalized 2-3 sentence explanation of why this book is recommended for this specific reader, referencing their reading history
- "matchScore": (number) A score from 1-100 indicating how well this matches their profile
- "similarTo": (string) The title of a book from their library this recommendation relates to

IMPORTANT: Return ONLY the raw JSON array, no markdown code fences, no explanation before or after. Just the array.`;

  return prompt;
}

/**
 * Parse OpenAI response into structured recommendations
 * @param {string} responseText - Raw text from OpenAI
 * @returns {Array} Parsed recommendations array
 */
function parseRecommendationResponse(responseText) {
  // Strip any markdown code fences if present
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not a JSON array");
    }

    // Validate and normalize each recommendation
    return parsed.slice(0, 5).map((item, index) => ({
      title: String(item.title || "Unknown Title"),
      authors: Array.isArray(item.authors)
        ? item.authors.map(String)
        : [String(item.author || item.authors || "Unknown Author")],
      reason: String(item.reason || "No reason provided"),
      matchScore: Math.min(100, Math.max(1, Number(item.matchScore) || 50)),
      similarTo: String(item.similarTo || "N/A"),
    }));
  } catch (error) {
    logger.error("Failed to parse OpenAI recommendation response", {
      error: error.message,
      responsePreview: cleaned.slice(0, 200),
    });
    throw new Error(
      `Failed to parse AI recommendations: ${error.message}`
    );
  }
}

/**
 * Generate AI-powered book recommendations for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Recommendations result with metadata
 */
async function generateRecommendations(userId) {
  logger.info("Generating AI recommendations", { userId });

  // 1. Build reading profile
  const profile = await getUserReadingProfile(userId);

  if (profile.totalBooks < 3) {
    logger.info("User has too few books for meaningful recommendations", {
      userId,
      totalBooks: profile.totalBooks,
    });
    return {
      recommendations: [],
      profile: {
        totalBooks: profile.totalBooks,
        completedCount: profile.completedCount,
        topGenres: profile.genres.slice(0, 5).map((g) => g.genre),
      },
      generatedAt: new Date().toISOString(),
      note: "Add at least 3 books to your library to get personalized recommendations.",
    };
  }

  // 2. Build the prompt
  const prompt = buildRecommendationPrompt(profile);

  // 3. Call OpenAI
  const client = getOpenAIClient();

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a book recommendation expert. You respond ONLY with valid JSON arrays. No markdown, no explanations outside the JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
  } catch (apiError) {
    logger.error("OpenAI API call failed", {
      userId,
      error: apiError.message,
      status: apiError.status,
    });
    throw new Error(`OpenAI API error: ${apiError.message}`);
  }

  const responseText = completion.choices?.[0]?.message?.content;
  if (!responseText) {
    logger.error("Empty response from OpenAI", { userId });
    throw new Error("OpenAI returned an empty response");
  }

  // 4. Parse the response
  const recommendations = parseRecommendationResponse(responseText);

  const result = {
    recommendations,
    profile: {
      totalBooks: profile.totalBooks,
      completedCount: profile.completedCount,
      topGenres: profile.genres.slice(0, 5).map((g) => g.genre),
    },
    generatedAt: new Date().toISOString(),
  };

  // 5. Cache the result
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
  await cache.set(cacheKey, result, CACHE_TTL);

  logger.info("AI recommendations generated and cached", {
    userId,
    count: recommendations.length,
  });

  return result;
}

/**
 * Get AI recommendations for a user (from cache or generate fresh)
 * @param {string} userId - The user's ID
 * @param {boolean} forceRefresh - If true, bypass cache and generate fresh
 * @returns {Promise<Object>} Recommendations result
 */
export async function getRecommendations(userId, forceRefresh = false) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;

  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info("AI recommendations cache hit", { userId });
        return {
          ...cached,
          fromCache: true,
        };
      }
    } catch (cacheError) {
      logger.warn("Cache read failed, generating fresh recommendations", {
        userId,
        error: cacheError.message,
      });
    }
  }

  // Generate fresh recommendations
  const result = await generateRecommendations(userId);
  return {
    ...result,
    fromCache: false,
  };
}

/**
 * Force-refresh recommendations for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Fresh recommendations
 */
export async function refreshRecommendations(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  logger.info("Force-refreshing AI recommendations", { userId });
  const result = await generateRecommendations(userId);
  return {
    ...result,
    refreshed: true,
    fromCache: false,
  };
}

export default {
  getRecommendations,
  refreshRecommendations,
};
