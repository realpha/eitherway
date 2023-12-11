// Slightly modified from the Deno standard library https://github.com/denoland/deno_std/blob/main/assert/assert.ts
export class AssertionError extends TypeError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AssertionError";
  }
}

// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// These are copied verbatim from the Deno standard library https://github.com/denoland/deno_std/blob/main/assert/assert.ts
export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}
