//deno-lint-ignore-file
import { Err } from "../lib/core/mod.ts";

Deno.bench({
  name: "Sync Exception Propagation",
  group: "Sync::Propagation",
  fn: () => {
    try {
      Exceptions.rethrow();
    } catch (e) {
    }
  },
});

Deno.bench({
  name: "Sync Error Propagation",
  group: "Sync::Propagation",
  baseline: true,
  fn: () => {
    Errors.linearReturn();
  },
});

export namespace Exceptions {
  function fail() {
    throw TypeError("Fail!");
  }
  function propagate() {
    try {
      return fail();
    } catch (e) {
      throw e;
    }
  }
  export function rethrow() {
    try {
      return propagate();
    } catch (e) {
      throw e;
    }
  }
}

export namespace Errors {
  function fail() {
    return Err(TypeError("Fail!"));
  }
  function propagate() {
    return fail();
  }
  export function linearReturn() {
    return propagate();
  }
}
