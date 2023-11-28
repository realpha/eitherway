//deno-lint-ignore-file
import { Task } from "../lib/async/mod.ts";

Deno.bench({
  name: "Async Exception Propagation",
  group: "Async::Propagation",
  fn: async () => {
    try {
      await AsyncExceptionCallStack.rethrow();
    } catch (e) {
    }
  },
});

Deno.bench({
  name: "Async Error Propagation",
  group: "Async::Propagation",
  fn: async () => {
    await TaskCallStack.linearReturn();
  },
});

export namespace AsyncExceptionCallStack {
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

export namespace TaskCallStack {
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
