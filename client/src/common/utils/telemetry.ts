export function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new SyntaxError(message ?? "Invalid application state");
  }
}

export function raise(message?: string): never {
  throw new SyntaxError(message ?? "Invalid application state");
}
