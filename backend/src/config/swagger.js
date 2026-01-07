import swaggerAutogen from "swagger-autogen";
import env from "./env.js";

const doc = {
  info: {
      title: "BookPath API",
  description: "API documentation for BookPath application",
    version: "1.0.0",
    contact: {
      name: "API Support",
              email: "support@bookpath.eu",
    },
  },
  host: env.API_HOST || "localhost:3001",
  basePath: "/api/v1",
  schemes: ["http", "https"],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      in: "header",
      name: "Authorization",
      description: "Enter your bearer token in the format: Bearer <token>",
    },
  },
  tags: [
    {
      name: "Auth",
      description: "Authentication endpoints",
    },
    {
      name: "Users",
      description: "User management endpoints",
    },
    {
      name: "Books",
      description: "Book management endpoints",
    },
    {
      name: "Collections",
      description: "Book collection management endpoints",
    },
  ],
  definitions: {
    User: {
      username: "johndoe",
      email: "john@example.com",
      subscriptionTier: "free",
      preferences: {
        theme: "light",
        booksPerPage: 10,
        defaultSearchType: "title",
      },
    },
    Book: {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      isbn: "9780743273565",
      description: "A story of the fabulously wealthy Jay Gatsby",
      coverImage: "https://example.com/cover.jpg",
      publishedYear: 1925,
    },
    BookCollection: {
      name: "My Favorite Books",
      description: "A collection of my favorite books",
      books: ["bookId1", "bookId2"],
      isPublic: true,
    },
    Error: {
      status: "error",
      message: "Error message",
      code: 400,
    },
    PaginatedResponse: {
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        pages: 1,
      },
    },
    RateLimitHeaders: {
      "X-RateLimit-Limit": 100,
      "X-RateLimit-Remaining": 99,
      "X-RateLimit-Reset": 60,
    },
  },
};

const outputFile = "./docs/swagger.json";
const endpointsFiles = [
  "./src/routes/authRoutes.js",
  "./src/routes/userRoutes.js",
  "./src/routes/bookRoutes.js",
  "./src/routes/collectionRoutes.js",
];

swaggerAutogen()(outputFile, endpointsFiles, doc);
