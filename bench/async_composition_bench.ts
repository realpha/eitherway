//deno-lint-ignore-file
import { Option, Result } from "../lib/core/mod.ts";
import { Task } from "../lib/async/task.ts";
import * as TaskOps from "../lib/async/operators.ts";

const INPUTS = [
  undefined,
  "fortytwo",
  "lenghtySuperLenghtyGibberishString",
  "",
  "5",
];

Deno.bench({
  name: "Async Exceptions",
  group: "Async::Composition",
  fn: async () => {
    for (const i of INPUTS) {
      try {
        await AsyncExceptions.processString(i);
      } catch (e) {
      }
    }
  },
});

Deno.bench({
  name: "Task Instance Composition",
  group: "Async::Composition",
  fn: async () => {
    for (const i of INPUTS) {
      await TaskFlows.instanceComposition(i);
    }
  },
});

Deno.bench({
  name: "Task Operator Composition",
  group: "Async::Composition",
  fn: async () => {
    for (const i of INPUTS) {
      await TaskFlows.operatorComposition(i);
    }
  },
});

Deno.bench({
  name: "Task Propagation with Early Return",
  group: "Async::Composition",
  fn: async () => {
    for (const i of INPUTS) {
      await TaskFlows.earlyReturn(i);
    }
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

namespace AsyncExceptions {
  async function toUpperCase(input: string | undefined): Promise<string> {
    if (typeof input === "undefined") {
      throw new TypeError("Input is undefined");
    }
    await sleep(1);
    return input.toUpperCase();
  }

  async function stringToLength(input: string): Promise<number> {
    if (input.length === 0) {
      throw new TypeError("Input string is empty");
    }
    await sleep(1);
    return input.length;
  }

  async function powerOfSelf(input: number): Promise<number> {
    if ([Infinity, -Infinity, NaN].includes(input)) {
      throw new TypeError("Input is not a valid number");
    }

    await sleep(1);
    const res = Math.pow(input, input);

    if ([Infinity, -Infinity, NaN].includes(res)) {
      throw new TypeError("Cannot calculate result");
    }

    return res;
  }

  export async function processString(
    input: string | undefined,
  ): Promise<number> {
    try {
      const upperCased = await toUpperCase(input);
      const length = await stringToLength(upperCased);
      return await powerOfSelf(length);
    } catch (error) {
      throw error;
    }
  }
}

namespace TaskFlows {
  function toUpperCase(input: string | undefined): Task<string, TypeError> {
    return Option(input)
      .okOrElse(() => TypeError("Input is undefined"))
      .into((res) => Task.of(res))
      .map(async (str) => {
        await sleep(1);
        return str.toUpperCase();
      });
  }

  function stringToLength(input: string): Task<number, TypeError> {
    return Option.fromCoercible(input)
      .okOrElse(() => TypeError("Input string is empty"))
      .into((res) => Task.of(res))
      .map(async (str) => {
        await sleep(1);
        return str.length;
      });
  }

  function powerOfSelf(input: number): Task<number, TypeError> {
    return Option.fromCoercible(input)
      .okOrElse(() => TypeError("Input is not a valid number"))
      .into((res) => Task.of(res))
      .andThen(async (n) => {
        await sleep(1);
        return Option.fromCoercible(Math.pow(n, n))
          .okOrElse(() => TypeError("Cannot calculate result"));
      });
  }

  export function instanceComposition(
    input: string | undefined,
  ): Task<number, TypeError> {
    return toUpperCase(input)
      .andThen(stringToLength)
      .andThen(powerOfSelf);
  }

  export async function operatorComposition(
    input: string | undefined,
  ): Promise<Result<number, TypeError>> {
    return toUpperCase(input)
      .then(TaskOps.andThen(stringToLength))
      .then(TaskOps.andThen(powerOfSelf));
  }

  export async function earlyReturn(
    input: string | undefined,
  ): Promise<Result<number, TypeError>> {
    const resStr = await toUpperCase(input);
    if (resStr.isErr()) return resStr;
    const resNum = await stringToLength(resStr.unwrap());
    if (resNum.isErr()) return resNum;

    return powerOfSelf(resNum.unwrap());
  }
}
