//deno-lint-ignore-file no-unused-vars
import { assertStrictEquals, assertThrows } from "../../dev_deps.ts";
import { Err, Ok, Result } from "./result.ts";

Deno.test("eitherway::Result", async (t) => {
  await t.step(".from() -> returns Result<T, never> inferred from fn", () => {
    const produceNum = () => 42;

    const res = Result.from(produceNum);

    assertStrictEquals(res.isOk(), true);
    assertStrictEquals(res.unwrap(), 42);
  });

  await t.step(
    ".from() -> propagates exception if infallible fn throws",
    () => {
      const SHOULD_THROW = true;
      const te = TypeError("Cannot do that");
      const throws = () => {
        if (SHOULD_THROW) throw te;
        return 42;
      };
      const shouldBeInfallible = () => Result.from(throws);

      assertThrows(shouldBeInfallible);
    },
  );

  await t.step(
    ".fromFallible() -> returns Result<T, E> inferred from fn and errMapFn",
    () => {
      const SHOULD_THROW = true;
      const te = TypeError("Cannot do that");
      const throws = () => {
        if (SHOULD_THROW) throw te;
        return 42;
      };
      const errMapFn = (e: unknown) => {
        if (e instanceof TypeError) return e;
        return new TypeError("Also cannot do that");
      };

      const res: Result<number, TypeError> = Result.fromFallible(
        throws,
        errMapFn,
      );

      assertStrictEquals(res.isErr(), true);
      assertStrictEquals(res.unwrap(), te);
    },
  );
});
Deno.test("eitherway::Result::Ok", () => {
});
Deno.test("eitherway::Result::Err", () => {
});
