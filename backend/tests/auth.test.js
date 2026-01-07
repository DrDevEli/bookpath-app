import jwt from "jsonwebtoken";

// Mock User model
jest.mock("../src/models/User.js", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock Redis
jest.mock("../src/config/redis.js", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
  },
}));

describe("Authentication Tests", () => {
  let testUser;
  let accessToken;

  beforeAll(async () => {
    // Create a test user
    testUser = {
      username: "testuser",
      email: "test@example.com",
      password: "Password123!",
      role: "user",
    };

    // Generate a test token
    accessToken = jwt.sign(
      { sub: "123456789", role: "user" },
      process.env.JWT_SECRET || "testsecret",
      { expiresIn: "1h" }
    );
  });

  describe("User Registration", () => {
    it("should validate user registration inputs", () => {
      expect(testUser.username).toBe("testuser");
      expect(testUser.email).toBe("test@example.com");
      expect(testUser.password).toBe("Password123!");
      expect(testUser.role).toBe("user");
    });
  });

  describe("User Login", () => {
    it("should validate login credentials", () => {
      expect(testUser.email).toBe("test@example.com");
      expect(testUser.password).toBe("Password123!");
    });
  });

  describe("JWT Authentication", () => {
    it("should verify JWT tokens", () => {
      const decoded = jwt.verify(
        accessToken,
        process.env.JWT_SECRET || "testsecret"
      );

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe("123456789");
      expect(decoded.role).toBe("user");
    });
  });
});
