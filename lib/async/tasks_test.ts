import type {
  InferredFailureTuple,
  InferredFailureType,
  InferredFailureUnion,
  InferredSuccessTuple,
  InferredSuccessType,
  InferredSuccessUnion,
} from "./tasks.ts";
import { Task, Tasks } from "./mod.ts";
import { Err, Ok } from "../core/mod.ts";
import {
  assertEquals,
  assertStrictEquals,
  assertType,
} from "../../dev_deps.ts";
import type { IsExact } from "../../dev_deps.ts";

Deno.test("eitherway::Task::InferredTypes", async (t) => {
  await t.step(
    "InferredSuccessType<P> -> inferres encapsulated type <T> correctly",
    () => {
      const task = Task.succeed("str");

      assertType<IsExact<InferredSuccessType<typeof task>, string>>(true);
    },
  );

  await t.step(
    "InferredFailureType<P> -> inferres encapsulated type <E> correctly",
    () => {
      const task = Task.fail(TypeError("This is the one"));

      assertType<IsExact<InferredFailureType<typeof task>, TypeError>>(true);
    },
  );

  await t.step(
    "InferredSuccessTuple<P> -> maps inferred tuples correctly",
    () => {
      const one = Task.succeed(1);
      const two = Task.succeed(true);
      const three = Task.fail("str");
      const tuple = [one, two, three] as const;

      assertType<
        IsExact<
          InferredSuccessTuple<typeof tuple>,
          readonly [number, boolean, never]
        >
      >(true);
    },
  );

  await t.step(
    "InferredFailureTuple<P> -> maps inferred tuples correctly",
    () => {
      const one = Task.fail("1");
      const two = Task.fail(Error());
      const three = Task.succeed(TypeError());
      const tuple = [one, two, three] as const;

      assertType<
        IsExact<
          InferredFailureTuple<typeof tuple>,
          readonly [string, Error, never]
        >
      >(true);
    },
  );

  await t.step(
    "InferredSuccessUnion<P> -> maps inferred tuples correctly to union",
    () => {
      const one = Task.succeed(1);
      const two = Task.succeed(true);
      const three = Task.succeed("str");
      const tuple = [one, two, three] as const;

      assertType<
        IsExact<InferredSuccessUnion<typeof tuple>, number | boolean | string>
      >(true);
    },
  );

  await t.step(
    "InferredFailureUnion<P> -> maps inferred tuples correctly to union",
    () => {
      const one = Task.fail("1");
      const two = Task.fail(Error());
      const three = Task.fail(TypeError());
      const tuple = [one, two, three] as const;

      assertType<
        IsExact<InferredFailureUnion<typeof tuple>, string | Error | TypeError>
      >(true);
    },
  );
});

Deno.test("eitherway::Tasks", async (t) => {
  await t.step(".all() -> collects Ok values into an array", async () => {
    const collection: Task<number, Error>[] = Array(5).fill(0).map((v, i) =>
      Task.succeed(v + i)
    );

    const success = Tasks.all(collection);
    const ok = await success;

    assertType<IsExact<typeof success, Task<number[], Error>>>(true);
    assertEquals(ok.unwrap(), [0, 1, 2, 3, 4]);
  });

  await t.step(
    ".all() -> returns the first instance of Err if present in iterable",
    async () => {
      const error = Err(TypeError("This is the one"));
      const collection: Task<number, TypeError>[] = Array(5).fill(0).map(
        (v, i) => {
          if (i === 3) return Task.of(error);
          return Task.succeed(v + i);
        },
      );

      const task = Tasks.all(collection);
      const err = await task;

      assertType<IsExact<typeof task, Task<number[], TypeError>>>(true);
      assertStrictEquals(err.isErr(), true);
      assertStrictEquals(error, err);
    },
  );

  await t.step(
    ".all() -> returns the correct type when used on tuples",
    async () => {
      const str = Task.succeed("str") as Task<string, TypeError>;
      const num = Task.succeed(123) as Task<number, RangeError>;
      const bool = Task.succeed(true) as Task<boolean, Error>;
      const tuple = [str, num, bool] as const;

      const task = Tasks.all(tuple);
      const ok = await task;

      assertType<
        IsExact<
          typeof task,
          Task<
            readonly [string, number, boolean],
            TypeError | RangeError | Error
          >
        >
      >(true);
      assertStrictEquals(ok.isOk(), true);
      assertEquals(ok.unwrap(), ["str", 123, true]);
    },
  );

  await t.step(".any() -> collects all Err values into an array", async () => {
    const collection: Task<string, number>[] = Array(5).fill(0).map((v, i) =>
      Task.fail(v + i)
    );

    const failure = Tasks.any(collection);
    const err = await failure;

    assertType<IsExact<typeof failure, Task<string, number[]>>>(true);
    assertStrictEquals(err.isErr(), true);
    assertEquals(err.unwrap(), [0, 1, 2, 3, 4]);
  });

  await t.step(
    ".any() -> returns the first instance of Ok if present in iterable",
    async () => {
      const success = Ok(42);
      const collection: Task<number, TypeError>[] = Array(5).fill(0).map(
        (_, i) => {
          if (i === 3) return Task.of(success);
          return Task.fail(TypeError());
        },
      );

      const task = Tasks.any(collection);
      const ok = await task;

      assertType<IsExact<typeof task, Task<number, TypeError[]>>>(true);
      assertStrictEquals(ok.isOk(), true);
      assertStrictEquals(ok, success);
    },
  );

  await t.step(
    ".any() -> returns the correct type when used on tuples",
    async () => {
      const str = Task.succeed("str") as Task<string, TypeError>;
      const num = Task.succeed(123) as Task<number, RangeError>;
      const bool = Task.succeed(true) as Task<boolean, Error>;
      const tuple = [str, num, bool] as const;

      const task = Tasks.any(tuple);
      const ok = await task;

      assertType<
        IsExact<
          typeof task,
          Task<
            string | number | boolean,
            readonly [TypeError, RangeError, Error]
          >
        >
      >(true);
      assertStrictEquals(ok.isOk(), true);
      assertEquals(ok.unwrap(), "str");
    },
  );
});
