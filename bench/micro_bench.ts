import { Task } from "../lib/async/task.ts";
import { Err, Ok } from "../lib/core/result.ts";
import { Option } from "../lib/core/option.ts";

Deno.bench({
  name: "Promise.resolve(Ok)",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Promise.resolve(Ok("foo"));
  },
});

Deno.bench({
  name: "Task.succeed",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Task.succeed("foo");
  },
});

Deno.bench({
  name: "Promise.resolve(Err)",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Promise.resolve(Err(Error("foo")));
  },
});

Deno.bench({
  name: "Task.fail",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Task.fail(Error("foo"));
  },
});

Deno.bench({
  name: "Ok",
  group: "Micro::Instantiation",
  fn: () => {
    const res = Ok("foo");
  },
});

Deno.bench({
  name: "Err",
  group: "Micro::Instantiation",
  fn: () => {
    const res = Err("foo");
  },
});

Deno.bench({
  name: "Option",
  group: "Micro::Instantiation",
  fn: () => {
    const res = Option("foo");
  },
});

Deno.bench({
  name: "Async Exception Propagation",
  group: "Micro::Propagation",
  fn: async () => {
    try {
      await AsyncExceptionCallStack.rethrow();
    } catch (e) {
    }
  },
});

Deno.bench({
  name: "Async Error Propagation",
  group: "Micro::Propagation",
  fn: async () => {
    await TaskCallStack.linearReturn();
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
