// Increase timeout for all tests since we're dealing with Redis
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup code here if needed
});
