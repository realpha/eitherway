//deno-lint-ignore-file no-namespace
import { Err, None, Ok, Option, Result, Some } from "../lib/core/mod.ts";

namespace SyncExceptions {
  function toUpperCase(input: string | undefined): string {
    if (typeof input === "undefined") {
      throw new TypeError("Input is undefined");
    }
    return input.toUpperCase();
  }

  function stringToLength(input: string): number {
    if (input.length === 0) {
      throw new TypeError("Input string is empty");
    }
    return input.length;
  }

  function powerOfSelf(input: number): number {
    if ([Infinity, -Infinity, NaN, undefined].includes(input)) {
      throw new TypeError("Input is not a valid number");
    }

    const res = Math.pow(input, input);

    if ([Infinity, -Infinity, NaN, undefined].includes(res)) {
      throw new TypeError("Cannot calculate result");
    }

    return res;
  }

  export function processString(input: string | undefined): number {
    try {
      const upperCased = toUpperCase(input);
      const length = stringToLength(upperCased);
      return powerOfSelf(length);
    } catch (error) {
      // if (error instanceof TypeError) {
      //   console.error(error.message);
      // } else {
      //   console.error("An unexpected error occurred:", error);
      // }
      throw error;
    }
  }
}

namespace SyncResultFlow {
  function toUpperCase(input: string | undefined): Result<string, TypeError> {
    return Option(input)
      .okOrElse(() => TypeError("Input is undefined"))
      .map((str) => str.toUpperCase());
  }

  function stringToLength(input: string): Result<number, TypeError> {
    return Option.fromCoercible(input)
      .okOrElse(() => TypeError("Input string is empty"))
      .map((str) => str.length);
  }

  function powerOfSelf(input: number): Result<number, TypeError> {
    return Option.fromCoercible(input)
      .okOrElse(() => TypeError("Input is not a valid number"))
      .andThen((n) => {
        return Option.fromCoercible(Math.pow(n, n))
          .okOrElse(() => TypeError("Cannot calculate result"));
      });
  }

  export function processString(
    input: string | undefined,
  ): Result<number, TypeError> {
    return toUpperCase(input)
      .andThen(stringToLength)
      .andThen(powerOfSelf);
    // .inspectErr(e => console.error(e.message));
  }
}

const INPUTS = [
  undefined,
  "fortytwo",
  "lenghtySuperLenghtyGibberishString",
  "",
  "5",
];

Deno.bench({
  name: "SyncExceptions",
  group: "Sync",
  fn: () => {
    INPUTS.forEach((i) => {
      try {
        SyncExceptions.processString(i);
      } catch (e) {
        //nothing to do here
      }
    });
  },
});

Deno.bench({
  name: "SyncResultFlow",
  group: "Sync",
  fn: () => {
    INPUTS.forEach((i) => SyncResultFlow.processString(i));
  },
});
