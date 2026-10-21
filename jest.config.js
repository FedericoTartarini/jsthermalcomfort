export default {
  transform: { "\\.ts$": "./jest.strip-types.js" },
  extensionsToTreatAsEsm: [".ts"],
  // .scratch/ is the local tracker, ignored only by a global gitignore that
  // Jest does not read; its run outputs hold copies of the test files.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/.scratch/"],
  modulePathIgnorePatterns: ["<rootDir>/.scratch/"],
};
