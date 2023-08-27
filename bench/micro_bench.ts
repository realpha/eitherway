import { Task } from "../lib/async/task.ts";
import { Err, Ok } from "../lib/core/result.ts";

Deno.bench({
  name: "Promise.resolve",
  group: "Micro::Resolve",
  fn: () => {
    const res = Promise.resolve(Ok("foo"));
  },
});

Deno.bench({
  name: "Task.succeed",
  group: "Micro::Resolve",
  fn: () => {
    const res = Task.succeed("foo");
  },
});

Deno.bench({
  name: "Async Exception Propagation",
  group: "Micro::Amortization",
  fn: async () => {
    try {
      await AsyncExceptionCallStack.rethrow();
    } catch (e) {
    }
  },
});

Deno.bench({
  name: "Async Error Propagation",
  group: "Micro::Amortization",
  fn: async () => {
    await TaskCallStack.linearReturn();
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export namespace AsyncExceptionCallStack {
  async function fail() {
    await sleep(1);
    throw TypeError("Fail!");
  }
  export async function rethrow() {
    try {
      return await fail();
    } catch (e) {
      throw e;
    }
  }
}

export namespace TaskCallStack {
  async function fail() {
    await sleep(1);
    return Err(TypeError("Fail!"));
  }
  export function linearReturn() {
    return Task.from(fail);
  }
}
