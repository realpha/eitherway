//deno-lint-ignore-file no-unused-vars
import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
  assertType,
} from "../../dev_deps.ts";
import type { IsExact } from "../../dev_deps.ts";
import { Err, Ok, Result } from "./result.ts";

Deno.test("eitherway::Result", async (t) => {
  await t.step(".from() -> returns Result<T, never> inferred from fn", () => {
    const produceNum = () => 42;

    const res = Result.from(produceNum);

    assertType<IsExact<typeof res, Result<number, never>>>(true);
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

      assertType<
        IsExact<ReturnType<typeof shouldBeInfallible>, Result<number, never>>
      >(true);
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

      const res = Result.fromFallible(
        throws,
        errMapFn,
      );

      assertType<IsExact<typeof res, Result<number, TypeError>>>(true);
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

      assertType<IsExact<typeof res, Result<number, TypeError>>>(true);
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

      assertType<IsExact<typeof res, Result<number, TypeError>>>(true);
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
        const okIter = ok[Symbol.iterator]();
        let count = 0;
        let lastValue = "";

        for (const value of ok) {
          count += 1;
          lastValue = value;
        }

        const arr = [...ok];

        assertType<IsExact<typeof okIter, IterableIterator<string>>>(true);
        assertStrictEquals(count, 3);
        assertStrictEquals(lastValue, "3");
        assertEquals(arr, ["1", "2", "3"]);
      },
    );

    await t.step(
      "[Symbol.iterator]() -> returns an empty IteratableIterator<never> if encapsulated value doesn't implement iterator protocol",
      () => {
        const ok = Ok(42);
        const okIter = ok[Symbol.iterator]();
        let count = 0;
        let lastValue = undefined;

        for (const value of ok) {
          count += 1;
          lastValue = value;
        }

        assertType<IsExact<typeof okIter, IterableIterator<never>>>(true);
        assertStrictEquals(count, 0);
        assertStrictEquals(lastValue, undefined);
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
        const errIter = err[Symbol.iterator]();
        let count = 0;
        let lastValue = undefined;

        for (const value of err) {
          count += 1;
          lastValue = value;
        }

        assertType<IsExact<typeof errIter, IterableIterator<never>>>(true);
        assertStrictEquals(count, 0);
        assertStrictEquals(lastValue, undefined);
      },
    );
  });
});
