//deno-lint-ignore-file no-namespace
import { Err } from "../lib/core/result.ts";
import { Task } from "../lib/async/task.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export namespace AsyncExceptionCallStack {
  async function fail() {
    await sleep(1);
    throw new TypeError("Fail!");
  }

  export async function depth1() {
    try {
    await sleep(1);
     return await fail();
    } catch (e) {
     throw e; 
    }
  }

  export async function depth2() {
    try {
    await sleep(1);
     return await depth1();   
    } catch (e) {
      throw e;
    }
  }

  export async function depth3() {
    try {
    await sleep(1);
     return await depth2(); 
    } catch (e) {
     throw e; 
    }
  }

  export async function depth4() {
    try {
    await sleep(1);
     return await depth3()  
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

  export async function depth1() {
    await sleep(1);
    return await fail();
  }

  export async function depth2() {
    await sleep(1);
    return await depth1();
  }

  export async function depth3() {
    await sleep(1);
    return await depth2();
  }

  export async function depth4() {
    await sleep(1);
    return await depth3();
  }
}

Deno.bench({
  name: "ExceptionCallStack - Depth: 1",
  group: "D1",
  fn: async() => {
    try {
      await AsyncExceptionCallStack.depth1();
    } catch (e) {
    }
  }
})

Deno.bench({
  name: "TaskCallStack - Depth: 1",
  group: "D1",
  fn: async () => {
    await TaskCallStack.depth1();
  }
});

Deno.bench({
  name: "ExceptionCallStack - Depth: 2",
  group: "D2",
  fn: async() => {
    try {
      await AsyncExceptionCallStack.depth2();
    } catch (e) {
    }
  }
})

Deno.bench({
  name: "TaskCallStack - Depth: 2",
  group: "D2",
  fn: async () => {
    await TaskCallStack.depth2();
  }
});

Deno.bench({
  name: "ExceptionCallStack - Depth: 3",
  group: "D3",
  fn: async() => {
    try {
      await AsyncExceptionCallStack.depth3();
    } catch (e) {
    }
  }
})

Deno.bench({
  name: "TaskCallStack - Depth: 3",
  group: "D3",
  fn: async () => {
    await TaskCallStack.depth3();
  }
});

Deno.bench({
  name: "ExceptionCallStack - Depth: 4",
  group: "D4",
  fn: async() => {
    try {
      await AsyncExceptionCallStack.depth4();
    } catch (e) {
    }
  }
})

Deno.bench({
  name: "TaskCallStack - Depth: 4",
  group: "D4",
  fn: async () => {
    await TaskCallStack.depth4();
  }
});
