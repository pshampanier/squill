//
// This file is automatically loaded before vitest runs any tests.
//

// Mock the WebSocket class because it's not available in nodejs
globalThis.WebSocket = class {
  constructor(_url: string) {}
  addEventListener(_event: string, _callback: unknown) {}
};
