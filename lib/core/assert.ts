import { Panic } from "./errors.ts";
// Slightly modified from the Deno standard library https://github.com/denoland/deno_std/blob/main/assert/assert.ts
export class AssertionError extends TypeError {
  name = "AssertionError";
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// These are copied verbatim from the Deno standard library https://github.com/denoland/deno_std/blob/main/assert/assert.ts
export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

export function assertNotNullish<T>(value: T): asserts value is NonNullable<T> {
  if (value == null) {
    Panic.causedBy(value, "Expected non-nullish value");
  }
}
