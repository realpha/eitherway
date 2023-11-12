//deno-lint-ignore-file  no-unused-vars require-await
import { asInfallible, Err, Ok, Result } from "../core/mod.ts";
import { Task } from "./task.ts";
import { assertStrictEquals, assertType } from "../../dev_deps.ts";
import type { Empty } from "../core/mod.ts";
import type { Has, IsExact } from "../../dev_deps.ts";

Deno.test("eitherway::Task", async (t) => {
  await t.step("Task<T, E> -> Constructors", async (t) => {
    await t.step(
      ".of() -> propagates exception asynchronously if Promise<Result<T,E>> throws",
      async () => {
        const SHOULD_THROW = true;
        const te = TypeError("Cannot do that");
        const throws = async () => {
          if (SHOULD_THROW) throw te;
          return Ok(42);
        };
        const promiseRes = throws();

        const task = Task.of(promiseRes);

        task.catch((e) => assertStrictEquals(e?.cause, te));
      },
    );

    await t.step(
      ".from() -> propagates exception asynchronously if infallible function throws",
      async () => {
        const SHOULD_THROW = true;
        const te = TypeError("Cannot do that");
        const throws = () => {
          if (SHOULD_THROW) throw te;
          return Ok(42);
        };

        const shouldBeInfallible = () => Task.from(throws);

        shouldBeInfallible().catch((e) => assertStrictEquals(e?.cause, te));
      },
    );

    await t.step(
      ".from() -> returns Task<T, E> from function returning Promise<Result<T, E>>",
      async () => {
        const succeed = async () => Ok("Hooray!");

        const success = await Task.from(succeed);

        assertStrictEquals(success.isOk(), true);
        assertStrictEquals(success.unwrap(), "Hooray!");
      },
    );

    await t.step(
      ".fromPromise() -> returns an infallible Task<T, never> if errMapFn produces never",
      async () => {
        const futureNumber = Promise.resolve(42);

        const infallible = await Task.fromPromise(futureNumber, asInfallible);

        assertStrictEquals(infallible.isErr(), false);
      },
    );

    await t.step(
      ".fromPromise() -> propagates exception asynchronously if infallible function throws",
      async () => {
        const te = TypeError("Cannot do that");
        const futureTypeError = Promise.reject(te);

        const shouldProduceInfallible = () =>
          Task.fromPromise(futureTypeError, asInfallible);

        shouldProduceInfallible().catch((e) =>
          assertStrictEquals(e?.cause, te)
        );
      },
    );

    await t.step(
      ".fromPromise() -> returns a Task<T, E>, where E is inferred from the errMapFn",
      async () => {
        const te = TypeError("Cannot do that");
        const futureTypeError = Promise.reject(te);
        const errMapFn = (e: unknown) => {
          if (e instanceof TypeError) return e;
          return TypeError("Can also not do that");
        };

        const failed = await Task.fromPromise(futureTypeError, errMapFn);

        assertStrictEquals(failed.unwrap(), te);
      },
    );

    await t.step(
      ".fromFallible() -> returns a Task<T, E>, where E is inferred from the errMapFn",
      async () => {
        const te = TypeError("Cannot do that");
        const produceTypeError = () => {
          throw te;
        };
        const produceTypeErrorAsync = async () => {
          produceTypeError();
        };
        const errMapFn = (e: unknown) => {
          if (e instanceof TypeError) return e;
          return TypeError("Can also not do that");
        };

        const failed = await Task.fromFallible(produceTypeError, errMapFn);
        const alsoFailed = await Task.fromFallible(
          produceTypeErrorAsync,
          errMapFn,
        );

        assertStrictEquals(failed.unwrap(), te);
        assertStrictEquals(alsoFailed.unwrap(), te);
      },
    );

    await t.step(
      ".fromFallible() -> propagates exception asynchronously if infallible function throws",
      async () => {
        const te = TypeError("Cannot do that");

        const shouldProduceInfallible = () =>
          Task.fromFallible(() => {
            throw te;
          }, asInfallible);

        const shouldProduceInfallibleAsync = () =>
          Task.fromFallible(async () => {
            throw te;
          }, asInfallible);

        shouldProduceInfallible().catch((e) =>
          assertStrictEquals(e?.cause, te)
        );
        shouldProduceInfallibleAsync().catch((e) =>
          assertStrictEquals(e?.cause, te)
        );
      },
    );
  });

  await t.step("Task<T, E> -> Instance Methods", async (t) => {
    await t.step("Task<T, E> -> Map Methods", async (t) => {
      await t.step(
        ".map() -> returns new Task instance with applied mapFn to value",
        async () => {
          const task = Task.succeed(41);

          const mapped = task.map(async (x) => x + 1);
          const res = await mapped;

          assertType<IsExact<typeof mapped, Task<number, never>>>(true);
          assertStrictEquals(mapped instanceof Task, true);
          assertStrictEquals(mapped === task, false);
          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 42);
        },
      );

      await t.step(
        ".mapErr() -> returns new Task instance with applied mapFn to err",
        async () => {
          const e = TypeError("Cannot do that");
          const task = Task.fail(e);

          const mapped = task.mapErr((e) =>
            TypeError("Received error", { cause: e })
          );
          const res = await mapped;

          assertType<IsExact<typeof mapped, Task<never, TypeError>>>(true);
          assertStrictEquals(mapped instanceof Task, true);
          assertStrictEquals(mapped === task, false);
          assertStrictEquals(res.isErr(), true);
          assertStrictEquals(res.unwrap().cause, e);
        },
      );

      await t.step(
        ".andThen() -> returns new Task instance with applied fn to value",
        async () => {
          const task = Task.succeed("1");
          const safeParse = async function (
            str: string,
          ): Promise<Result<number, TypeError>> {
            const n = Number.parseInt(str);

            return Number.isNaN(n) ? Err(TypeError("Cannot parse")) : Ok(n);
          };

          const chained = task.andThen(safeParse);
          const res = await chained;

          assertType<IsExact<typeof chained, Task<number, TypeError>>>(true);
          //@ts-expect-error Incompatible types but ref COULD be equal
          assertStrictEquals(task === chained, false);
          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 1);
        },
      );

      await t.step(
        ".orElse() -> returns a new Task instance with applied fn to err",
        async () => {
          const task = Task.fail(
            Error("Received error", { cause: TypeError("Cannot do that") }),
          );
          const rehydrate = function (err: unknown): Task<number, RangeError> {
            if (!(err instanceof Error)) {
              return Task.fail(RangeError("Cannot rehydrate"));
            }
            return Task.succeed(0);
          };

          const chained = task.orElse(rehydrate);
          const res = await chained;

          assertType<IsExact<typeof chained, Task<number, RangeError>>>(true);
          assertStrictEquals(task === chained, false);
          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 0);
        },
      );

      await t.step(
        ".trip() -> returns Ok value as is if tripFn succeeds",
        async () => {
          const success: Task<number, TypeError> = Task.succeed(42);
          const tripFn = (n: number): Result<Empty, RangeError> =>
            n % 2 === 0 ? Ok.empty() : Err(RangeError());

          const okTask = success.trip(tripFn);

          assertType<
            IsExact<typeof okTask, Task<number, TypeError | RangeError>>
          >(true);

          const ok = await okTask;

          assertStrictEquals(ok.isOk(), true);
          assertStrictEquals(ok.unwrap(), 42);
        },
      );

      await t.step(
        ".trip() -> derailts the successful Task if tripFn succeeds",
        async () => {
          const re = RangeError("Cannot do that");
          const success: Task<number, TypeError> = Task.succeed(41);
          const tripFn = (n: number): Result<Empty, RangeError> =>
            n % 2 === 0 ? Ok.empty() : Err(re);

          const okTask = success.trip(tripFn);

          assertType<
            IsExact<typeof okTask, Task<number, TypeError | RangeError>>
          >(true);

          const ok = await okTask;

          assertStrictEquals(ok.isOk(), false);
          assertStrictEquals(ok.unwrap(), re);
        },
      );

      await t.step(".trip() -> is a no-op in case of Err", async () => {
        const te = TypeError("Cannot do that");
        const failure: Task<number, TypeError> = Task.fail(te);
        const tripFn = (n: number): Result<Empty, RangeError> =>
          n % 2 === 0 ? Ok.empty() : Err(RangeError());

        const errTask = failure.trip(tripFn);

        assertType<
          IsExact<typeof errTask, Task<number, TypeError | RangeError>>
        >(true);

        const err = await errTask;

        assertStrictEquals(err.isErr(), true);
        assertStrictEquals(err.unwrap(), te);
      });
    });

    await t.step("Task<T, E> -> Transformation Methods", async (t) => {
      await t.step(
        ".iter() -> returns an AsyncIteratable<T> in case of success",
        async () => {
          const success: Task<string, Error> = Task.succeed("foo");

          const okIter = success.iter();

          let count = 0;
          let value: string | undefined;

          for await (const v of okIter) {
            count += 1;
            value = v;
          }

          assertType<IsExact<typeof okIter, AsyncIterableIterator<string>>>(
            true,
          );
          assertStrictEquals(count, 1);
          assertStrictEquals(value, "foo");
        },
      );

      await t.step(
        ".iter() -> returns an empty AsyncIteratable<T> in case of failure",
        async () => {
          const failure: Task<string, Error> = Task.fail(Error());

          const errIter = failure.iter();

          let count = 0;
          let value: string | undefined;

          for await (const v of errIter) {
            count += 1;
            value = v;
          }

          assertType<IsExact<typeof errIter, AsyncIterableIterator<string>>>(
            true,
          );
          assertStrictEquals(count, 0);
          assertStrictEquals(value, undefined);
        },
      );
    });

    await t.step("Task<T, E> -> JS well-known Symbols & Methods", async (t) => {
      await t.step(".toString() -> returns the full string tag", () => {
        const tag = Task.succeed(42).toString();

        assertStrictEquals(tag, "[object eitherway::Task]");
      });

      await t.step("[Symbol.toStringTag] -> returns the FQN", () => {
        const fqn = Task.succeed(42)[Symbol.toStringTag];

        assertStrictEquals(fqn, "eitherway::Task");
      });

      await t.step(
        "[Symbol.asyncIterator]() -> delegates to the underlying implementation in case of success",
        async () => {
          class FakeStream implements AsyncIterable<number> {
            #value: number;
            constructor(value: number) {
              this.#value = value;
            }
            async *[Symbol.asyncIterator](): AsyncIterableIterator<number> {
              yield this.#value;
            }
          }

          const stream = new FakeStream(42);
          const success: Task<FakeStream, Error> = Task.succeed(stream);

          let count = 0;
          let value: number | undefined;

          for await (const v of success) {
            count += 1;
            value = v;
          }

          const okIter = success[Symbol.asyncIterator]();

          assertType<IsExact<typeof okIter, AsyncIterableIterator<number>>>(
            true,
          );
          assertStrictEquals(count, 1);
          assertStrictEquals(value, 42);
        },
      );

      await t.step(
        "[Symbol.asyncIterator]() -> returns an empty AsyncIterable<never> if success value doesn't implement async iterator protocol",
        async () => {
          class FakeStream implements Iterable<number> {
            #value: number;
            constructor(value: number) {
              this.#value = value;
            }
            *[Symbol.iterator](): IterableIterator<number> {
              yield this.#value;
            }
          }

          const stream = new FakeStream(42);
          const success: Task<FakeStream, Error> = Task.succeed(stream);

          let count = 0;
          let value: number | undefined;

          for await (const v of success) {
            count += 1;
            value = v;
          }

          const okIter = success[Symbol.asyncIterator]();

          assertType<IsExact<typeof okIter, AsyncIterableIterator<never>>>(
            true,
          );
          assertStrictEquals(count, 0);
          assertStrictEquals(value, undefined);
        },
      );

      await t.step(
        "[Symbol.asyncIterator]() -> returns an empty AsyncIterable<never> in case of failure",
        async () => {
          const failure = Task.fail(Error());

          let count = 0;
          let value: undefined;

          for await (const v of failure) {
            count += 1;
            value = v;
          }

          const errIter = failure[Symbol.asyncIterator]();

          assertType<IsExact<typeof errIter, AsyncIterableIterator<never>>>(
            true,
          );
          assertStrictEquals(count, 0);
          assertStrictEquals(value, undefined);
        },
      );
    });
  });

  await t.step("Task<T, E> -> Operators", async (t) => {
    await t.step("Task<T, E> -> Map Operators", async (t) => {
      await t.step(
        "Task.map() -> returns Promise<Result> with applied mapFn",
        async () => {
          const p: Promise<Result<number, TypeError>> = Promise.resolve(Ok(41));

          const mapped = p.then(Task.map((x) => x + 1));
          const res = await mapped;

          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 42);
        },
      );

      await t.step(
        "Task.mapErr() -> returns Promise<Result> with applied mapFn to err",
        async () => {
          const e = TypeError("Cannot do that");
          const p: Promise<Result<number, TypeError>> = Promise.resolve(Err(e));

          const mapped = p.then(
            Task.mapErr((e) => TypeError("Received error", { cause: e })),
          );
          const res = await mapped;

          assertStrictEquals(res.isErr(), true);
          //@ts-expect-error The assertion above doesn't narrow the type
          assertStrictEquals(res.unwrap().cause, e);
        },
      );

      await t.step(
        "Task.andThen() -> returns Promise<Result> with applied fn to value",
        async () => {
          const p: Promise<Result<string, TypeError>> = Promise.resolve(
            Ok("1"),
          );
          const safeParse = async function (
            str: string,
          ): Promise<Result<number, TypeError>> {
            const n = Number.parseInt(str);

            return Number.isNaN(n) ? Err(TypeError("Cannot parse")) : Ok(n);
          };

          const chained = p.then(Task.andThen(safeParse));
          const res = await chained;

          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 1);
        },
      );

      await t.step(
        "Task.orElse() -> returns a Promise<Result> with applied fn to err",
        async () => {
          const p: Promise<Result<never, Error>> = Promise.resolve(Err(
            Error("Received error", { cause: TypeError("Cannot do that") }),
          ));
          const rehydrate = async function (err: unknown) {
            if (!(err instanceof Error)) {
              return Task.fail(RangeError("Cannot rehydrate"));
            }
            return Task.succeed(0);
          };

          const chained = p.then(Task.orElse(rehydrate));
          const res = await chained;

          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 0);
        },
      );
    });
  });
});
