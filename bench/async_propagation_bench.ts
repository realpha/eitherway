//deno-lint-ignore-file
import { Task } from "../lib/async/mod.ts";

Deno.bench({
  name: "Async Exception Propagation",
  group: "Async::Propagation",
  fn: async () => {
    try {
      await AsyncExceptions.rethrow();
    } catch (e) {
    }
  },
});

Deno.bench({
  name: "Task Error Propagation",
  group: "Async::Propagation",
  baseline: true,
  fn: async () => {
    await TaskErrors.linearReturn();
  },
});

export namespace AsyncExceptions {
  async function fail() {
    throw TypeError("Fail!");
  }
  async function propagate() {
    try {
      return await fail();
    } catch (e) {
      throw e;
    }
  }
  export async function rethrow() {
    try {
      return await propagate();
    } catch (e) {
      throw e;
    }
  }
}

export namespace TaskErrors {
  function fail() {
    return Task.fail(TypeError("Fail!"));
  }
  async function propagate() {
    return await fail();
  }
  export async function linearReturn() {
    return await propagate();
  }
}
