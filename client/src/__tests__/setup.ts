//
// This file is automatically loaded before vitest runs any tests.
//

// Mock the WebSocket class because it's not available in nodejs
globalThis.WebSocket = class {
  constructor(url: string) {
    console.log(`Mock WebSocket created with URL: ${url}`);
  }

  addEventListener(event: string, _callback: unknown) {
    console.log(`Mock WebSocket event listener added for: ${event}`);
  }

  // Add any other mock methods you need (e.g., send, close)
};
