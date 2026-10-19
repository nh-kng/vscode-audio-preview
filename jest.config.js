module.exports = {
  automock: false,
  rootDir: "src",
  testEnvironment: "jsdom",
  setupFiles: ["jest-canvas-mock"],
  moduleNameMapper: {
    "\\.css$": "<rootDir>/__mocks__/styleMock.js",
    "\\.svg$": "<rootDir>/__mocks__/svgMock.js",
  },
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
