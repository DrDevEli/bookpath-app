export default {
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  testEnvironment: "node",
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 10000,
  moduleFileExtensions: ["js", "json", "node"],
  transformIgnorePatterns: ["node_modules/(?!(supertest)/)"],
};
