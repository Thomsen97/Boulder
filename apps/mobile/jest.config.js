module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.env.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  // The first renderRouter() of a file compiles the whole route tree, which is slow on a cold cache.
  testTimeout: 30000,
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
