// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// These are copied verbatim from the Deno standard library https://github.com/denoland/deno_std/blob/main/assert/assert.ts 
class AssertionError extends Error {
  override name = "AssertionError";
  constructor(message: string) {
    super(message);
  }
}

export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}
