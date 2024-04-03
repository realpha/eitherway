//deno-lint-ignore-file
import { Task } from "../lib/async/mod.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    await sleep(1);
    throw TypeError("Fail!");
  }
  async function propagate() {
    try {
      await sleep(1);
      return await fail();
    } catch (e) {
      throw e;
    }
  }
  export async function rethrow() {
    try {
      await sleep(1);
      return await propagate();
    } catch (e) {
      throw e;
    }
  }
}

export namespace TaskErrors {
  async function fail() {
    await sleep(1);
    return Task.fail(TypeError("Fail!"));
  }
  async function propagate() {
    await sleep(1);
    return await fail();
  }
  export async function linearReturn() {
    await sleep(1);
    return await propagate();
  }
}
