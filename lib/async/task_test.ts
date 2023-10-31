//deno-lint-ignore-file  no-unused-vars require-await
import { asInfallible, Err, Ok, Result } from "../core/result.ts";
import { Task } from "./task.ts";
import { assertStrictEquals } from "../../dev_deps.ts";

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

          assertStrictEquals(task === chained, false);
          assertStrictEquals(res.isOk(), true);
          assertStrictEquals(res.unwrap(), 0);
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
