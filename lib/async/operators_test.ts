//deno-lint-ignore-file require-await
import { Err, Ok, Result } from "../core/mod.ts";
import { Task } from "./task.ts";
import * as Operators from "./operators.ts";
import {
  assertStrictEquals,
} from "../../dev_deps.ts";

Deno.test("eitherway::Task::Operators", async (t) => {
  await t.step("Map Operators", async (t) => {
    await t.step(
      "map() -> returns Promise<Result> with applied mapFn",
      async () => {
        const p: Promise<Result<number, TypeError>> = Promise.resolve(Ok(41));

        const mapped = p.then(Operators.map((x) => x + 1));
        const res = await mapped;

        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 42);
      },
    );

    await t.step(
      "mapErr() -> returns Promise<Result> with applied mapFn to err",
      async () => {
        const e = TypeError("Cannot do that");
        const p: Promise<Result<number, TypeError>> = Promise.resolve(Err(e));

        const mapped = p.then(
          Operators.mapErr((e) => TypeError("Received error", { cause: e })),
        );
        const res = await mapped;

        assertStrictEquals(res.isErr(), true);
        //@ts-expect-error The assertion above doesn't narrow the type
        assertStrictEquals(res.unwrap().cause, e);
      },
    );

    await t.step(
      "andThen() -> returns Promise<Result> with applied fn to value",
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

        const chained = p.then(Operators.andThen(safeParse));
        const res = await chained;

        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 1);
      },
    );

    await t.step(
      "orElse() -> returns a Promise<Result> with applied fn to err",
      async () => {
        const p: Promise<Result<never, Error>> = Promise.resolve(Err(
          Error("Received error", { cause: TypeError("Cannot do that") }),
        ));
        const rehydrate = function (err: unknown) {
          if (!(err instanceof Error)) {
            return Task.fail(RangeError("Cannot rehydrate"));
          }
          return Task.succeed(0);
        };

        const chained = p.then(Operators.orElse(rehydrate));
        const res = await chained;

        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 0);
      },
    );
  });
});
