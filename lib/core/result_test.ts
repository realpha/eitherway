//deno-lint-ignore-file no-unused-vars
import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
  assertType,
} from "../../dev_deps.ts";
import type { IsExact } from "../../dev_deps.ts";
import { Err, Ok, Result, Results } from "./result.ts";
import type {
  InferredErrTuple,
  InferredErrType,
  InferredErrUnion,
  InferredOkTuple,
  InferredOkType,
  InferredOkUnion,
} from "./result.ts";

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

Deno.test("eitherway::Result::InferredTypes", async (t) => {
  await t.step(
    "InferredOkType<R> -> inferres encapsulated type <T> correctly",
    () => {
      const ok = Ok(2);
      const res: Result<string, TypeError> = Ok("str");

      assertType<IsExact<InferredOkType<typeof ok>, number>>(true);
      assertType<IsExact<InferredOkType<typeof res>, string>>(true);
    },
  );

  await t.step(
    "InferredErrType<R> -> inferres encapsulated type <E> correctly",
    () => {
      const err = Err(TypeError("This is the one"));
      const res: Result<number, string> = Err("str");

      assertType<IsExact<InferredErrType<typeof err>, TypeError>>(true);
      assertType<IsExact<InferredErrType<typeof res>, string>>(true);
    },
  );

  await t.step("InferredOkTuple<R> -> maps inferred tuples correctly", () => {
    const one: Result<number, string> = Ok(1);
    const two: Result<boolean, Error> = Ok(true);
    const three: Result<string, TypeError> = Ok("str");
    const tuple = [one, two, three] as const;

    assertType<
      IsExact<InferredOkTuple<typeof tuple>, readonly [number, boolean, string]>
    >(true);
  });

  await t.step("InferredErrTuple<R> -> maps inferred tuples correctly", () => {
    const one: Result<number, string> = Err("1");
    const two: Result<boolean, Error> = Err(Error());
    const three: Result<string, TypeError> = Err(TypeError());
    const tuple = [one, two, three] as const;

    assertType<
      IsExact<
        InferredErrTuple<typeof tuple>,
        readonly [string, Error, TypeError]
      >
    >(true);
  });

  await t.step(
    "InferredOkUnion<R> -> maps inferred tuples correctly to union",
    () => {
      const one: Result<number, string> = Ok(1);
      const two: Result<boolean, Error> = Ok(true);
      const three: Result<string, TypeError> = Ok("str");
      const tuple = [one, two, three] as const;

      assertType<
        IsExact<InferredOkUnion<typeof tuple>, number | boolean | string>
      >(true);
    },
  );

  await t.step(
    "InferredErrUnion<R> -> maps inferred tuples correctly to union",
    () => {
      const one: Result<number, string> = Err("1");
      const two: Result<boolean, Error> = Err(Error());
      const three: Result<string, TypeError> = Err(TypeError());
      const tuple = [one, two, three] as const;

      assertType<
        IsExact<InferredErrUnion<typeof tuple>, string | Error | TypeError>
      >(true);
    },
  );
});

Deno.test("eitherway::Results", async (t) => {
  await t.step(".all() -> collects Ok values into an array", () => {
    const collection: Result<number, Error>[] = Array(5).fill(0).map((v, i) =>
      Ok(v + i)
    );

    const areOk = Results.all(collection);

    assertType<IsExact<typeof areOk, Result<number[], Error>>>(true);
    assertStrictEquals(areOk.isOk(), true);
    assertEquals(areOk.unwrap(), [0, 1, 2, 3, 4]);
  });

  await t.step(
    ".all() -> returns the first instance of Err if present in iterable",
    () => {
      const err = Err(TypeError("This is the one"));
      const secondErr = Err(TypeError("This is the second one"));
      const collection = [Ok(42), Ok(17), err, Ok(3), secondErr];

      const result = Results.all(collection);

      assertType<IsExact<typeof result, Result<number[], TypeError>>>(true);
      assertStrictEquals(result.isErr(), true);
      assertStrictEquals(result, err);
    },
  );

  await t.step(".all() -> returns the correct type when used on tuples", () => {
    const str = Ok("str") as Result<string, TypeError>;
    const num = Ok(123) as Result<number, RangeError>;
    const bool = Ok(true) as Result<boolean, Error>;
    const tuple = [str, num, bool] as const;

    const result = Results.all(tuple);

    assertType<
      IsExact<
        typeof result,
        Result<
          readonly [string, number, boolean],
          TypeError | RangeError | Error
        >
      >
    >(true);
    assertStrictEquals(result.isOk(), true);
    assertEquals(result.unwrap(), ["str", 123, true]);
  });

  await t.step(".any() -> collects all Err values into an array", () => {
    const collection: Result<string, number>[] = Array(5).fill(0).map((v, i) =>
      Err(v + i)
    );

    const areErr = Results.any(collection);

    assertType<IsExact<typeof areErr, Result<string, number[]>>>(true);
    assertStrictEquals(areErr.isErr(), true);
    assertEquals(areErr.unwrap(), [0, 1, 2, 3, 4]);
  });

  await t.step(
    ".any() -> returns the first instance of Ok if present in iterable",
    () => {
      const success = Ok("this is the one");
      const secondSuccess = Ok("this is the second one");
      const collection = [
        Err(TypeError()),
        Err(TypeError()),
        success,
        Err(TypeError()),
        secondSuccess,
      ];

      const result = Results.any(collection);

      assertType<IsExact<typeof result, Result<string, TypeError[]>>>(true);
      assertStrictEquals(result.isOk(), true);
      assertStrictEquals(result, success);
    },
  );

  await t.step(".any() -> returns the correct type when used on tuples", () => {
    const str = Ok("str") as Result<string, TypeError>;
    const num = Ok(123) as Result<number, RangeError>;
    const bool = Ok(true) as Result<boolean, Error>;
    const tuple = [str, num, bool] as const;

    const result = Results.any(tuple);

    assertType<
      IsExact<
        typeof result,
        Result<
          string | number | boolean,
          readonly [TypeError, RangeError, Error]
        >
      >
    >(true);
    assertStrictEquals(result.isOk(), true);
    assertEquals(result.unwrap(), "str");
  });
});

Deno.test("eitherway::Result::Ok", async (t) => {
  await t.step("Ok<T> -> JS well-known Symbols and Methods", async (t) => {
    await t.step(".toString() -> returns the string tag", () => {
      const okTag = Ok("thing").toString();

      assertStrictEquals(okTag, "[object eitherway::Result::Ok<thing>]");
    });

    await t.step("[Symbol.toStringTag] -> returns the FQN", () => {
      const fqn = Ok("thing")[Symbol.toStringTag];

      assertStrictEquals(fqn, "eitherway::Result::Ok<thing>");
    });
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
    await t.step(".toString() -> returns the string tag", () => {
      const errTag = Err(Error()).toString();

      assertStrictEquals(
        errTag,
        "[object eitherway::Result::Err<[object Error]>]",
      );
    });

    await t.step("[Symbol.toStringTag] -> returns the FQN", () => {
      const fqn = Err(Error())[Symbol.toStringTag];

      assertStrictEquals(fqn, "eitherway::Result::Err<[object Error]>");
    });
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
