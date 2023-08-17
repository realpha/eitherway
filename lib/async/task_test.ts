import { Err, Ok, Result } from "../core/result.ts";
import { Task } from "./task.ts";
import { assertEquals, assertObjectMatch, assertStrictEquals } from "../../dev_deps.ts"


Deno.test("eitherway::Task", async (t) => {
  await t.step("Task<T, E> -> Constructors", async (t) => {
  })
  await t.step("Task<T, E> -> Instance Methods", async (t) => {
    await t.step("Task<T, E> -> Map Methods", async (t) => {
      await t.step("map() -> returns new Task instance with applied mapFn to value", async () => {
        const task = Task.ok(41);

        const mapped = task.map(async (x) => x + 1);
        const res = await mapped;

        assertStrictEquals(mapped instanceof Task, true);
        assertStrictEquals(mapped === task, false);
        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 42);
      });

      await t.step("mapErr() -> returns new Task instance with applied mapFn to err", async () => {
        const e = TypeError("Cannot do that");
        const task = Task.err(e);

        const mapped = task.mapErr(e => TypeError("Received error", { cause: e }));
        const res = await mapped;

        assertStrictEquals(mapped instanceof Task, true);
        assertStrictEquals(mapped === task, false);
        assertStrictEquals(res.isErr(), true);
        assertStrictEquals(res.unwrap().cause, e);
      });

      await t.step("andThen() -> returns new Task instance with applied fn to value", async () => {
        const task = Task.ok("1");
        const safeParse = async function(str: string): Promise<Result<number, TypeError>> {
          const n = Number.parseInt(str);

          return Number.isNaN(n) ? Err(TypeError("Cannot parse")) : Ok(n);
        }

        const chained = task.andThen(safeParse);
        const res = await chained;

        //@ts-expect-error Incompatible types but ref COULD be equal
        assertStrictEquals(task === chained, false);
        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 1);
      });

    });
  })
  await t.step("Task<T, E> -> Operators", async (t) => {
    await t.step("Task<T, E> -> Map Operators", async (t) => {
      await t.step("Task.map() -> returns new Task instance with applied mapFn", async () => {
        const p: Promise<Result<number, TypeError>> = Promise.resolve(Ok(41));

        const mapped = p.then(Task.map((x) => x + 1));
        const res = await mapped;

        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 42);
      })

      await t.step("Task.mapErr() -> returns new Task instance with applied mapFn to err", async () => {
        const e = TypeError("Cannot do that");
        const p: Promise<Result<number, TypeError>> = Promise.resolve(Err(e));

        const mapped = p.then(Task.mapErr((e) => TypeError("Received error", { cause: e })));
        const res = await mapped;

        assertStrictEquals(res.isErr(), true);
        //@ts-expect-error The assertion above doesn't narrow the type
        assertStrictEquals(res.unwrap().cause, e);
      });

      await t.step("Task.andThen() -> returns new Task instance with applied fn to value", async () => {

        const p: Promise<Result<string, TypeError>> = Promise.resolve(Ok("1"));
        const safeParse = async function(str: string): Promise<Result<number, TypeError>> {
          const n = Number.parseInt(str);

          return Number.isNaN(n) ? Err(TypeError("Cannot parse")) : Ok(n);
        }

        const chained = p.then(Task.andThen(safeParse));
        const res = await chained;

        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 1);
      });
    })
  })
});
