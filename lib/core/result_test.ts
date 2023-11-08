//deno-lint-ignore-file no-unused-vars
import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "../../dev_deps.ts";
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

  await t.step(
    ".lift() -> composes functions and constructors correctly",
    () => {
      const powerOfTwo = (n: number) => Math.pow(n, 2);
      const toEven = (n: number) => {
        if (n % 2 === 0) return Ok(n);
        return Err(TypeError("Not even"));
      };

      const toEvenPowerOfTwo = Result.lift(powerOfTwo, toEven);
      const res = Ok(9).andThen(toEvenPowerOfTwo);

      assertStrictEquals(res.isOk(), false);
      assertStrictEquals(res.unwrap().constructor, TypeError);
    },
  );

  await t.step(
    ".liftFallible() -> composes fallible functions and constructors correctly",
    () => {
      const te = TypeError("Cannot do that");
      const powerOfTwo = (n: number) => {
        if (n < 10) throw te;
        return Math.pow(n, 2);
      };
      const errMapFn = (e: unknown) => {
        if (e instanceof TypeError) return e;
        return new TypeError("Also cannot do that");
      };
      const toEven = (n: number) => {
        if (n % 2 === 0) return Ok(n);
        return Err(TypeError("Not even"));
      };

      const toEvenPowerOfTwo = Result.liftFallible(
        powerOfTwo,
        errMapFn,
        toEven,
      );
      const res = Ok(9).andThen(toEvenPowerOfTwo);

      assertStrictEquals(res.isErr(), true);
      assertStrictEquals(res.unwrap().constructor, TypeError);
    },
  );
});
Deno.test("eitherway::Result::Ok", async (t) => {
  await t.step("Ok<T> -> JS well-known Symbols and Methods", async (t) => {
    await t.step(
      "[Symbol.iterator]() -> conforms iterator protocol and delegates to underlying implementation",
      () => {
        const ok = Ok("123");
        let count = 0;
        let lastValue = "";

        for (const value of ok) {
          count += 1;
          lastValue = value;
        }

        const arr = [...ok];

        assertStrictEquals(count, 3);
        assertStrictEquals(lastValue, "3");
        assertEquals(arr, ["1", "2", "3"]);
      },
    );
  });
});

Deno.test("eitherway::Result::Err", async (t) => {
  await t.step("Err<E> -> JS well-known Symbols and Methods", async (t) => {
    await t.step(
      "[Symbol.iterator]() -> conforms iterator protocol and represents the empty iterator",
      () => {
        const err = Err("result");
        let count = 0;
        let inner = "";

        for (const value of err) {
          count += 1;
          inner = value;
        }

        assertStrictEquals(count, 0);
        assertStrictEquals(inner, "");
      },
    );
  });
});
