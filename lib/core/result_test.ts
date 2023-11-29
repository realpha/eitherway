import {
  assertEquals,
  assertInstanceOf,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
  assertType,
} from "../../dev_deps.ts";
import type { IsExact } from "../../dev_deps.ts";
import { Empty, None, Option } from "./mod.ts";
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
  await t.step("Ok<T> -> Type Predicates", async (t) => {
    await t.step(".isOk() -> narrows to Ok by returning true", () => {
      const res = Ok(42) as Result<number, TypeError>;

      if (res.isOk()) {
        assertType<IsExact<typeof res, Ok<number>>>(true);
      }

      assertStrictEquals(res.isOk(), true);
    });

    await t.step(".isErr() -> narrows to Err by returning false", () => {
      const res = Ok(42) as Result<number, TypeError>;

      if (res.isErr()) {
        assertType<IsExact<typeof res, Err<TypeError>>>(true);
      }

      assertStrictEquals(res.isErr(), false);
    });
  });

  await t.step("Ok<T> -> Map Methods", async (t) => {
    await t.step(
      ".map() -> returns new instance of Ok with applied mapFn",
      () => {
        const toNumber = (str: string) => str.length;
        const ok = Ok("thing") as Result<string, Error>;

        const res = ok.map(toNumber);

        assertType<IsExact<typeof res, Result<number, Error>>>(true);
        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 5);
      },
    );

    await t.step(
      ".mapOr() -> returns new instance of Ok with applied mapFn",
      () => {
        const fallback = 10;
        const toNumber = (str: string) => str.length;
        const ok = Ok("thing") as Result<string, Error>;

        const res = ok.mapOr(toNumber, fallback);

        assertType<IsExact<typeof res, Ok<number>>>(true);
        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 5);
      },
    );

    await t.step(
      ".mapOrElse() -> returns new instance of Ok with applied mapFn",
      () => {
        const fallback = () => 10;
        const toNumber = (str: string) => str.length;
        const ok = Ok("thing") as Result<string, Error>;

        const res = ok.mapOrElse(toNumber, fallback);

        assertType<IsExact<typeof res, Ok<number>>>(true);
        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 5);
      },
    );

    await t.step(".mapErr() -> short-circuits and returns immediately", () => {
      const toTypeError = (e: Error) =>
        TypeError("Something went wrong", { cause: e });
      const ok = Ok(42) as Result<number, Error>;

      const mapped = ok.mapErr(toTypeError);

      assertType<IsExact<typeof mapped, Result<number, TypeError>>>(true);
      assertStrictEquals(mapped, ok);
      assertStrictEquals(mapped.isOk(), true);
      assertStrictEquals(mapped.unwrap(), 42);
    });

    await t.step(
      ".andThen() -> returns new instance of Result with supplied thenFn",
      () => {
        const processString = function (
          str: string,
        ): Result<number, TypeError> {
          if (str.length > 5) return Ok(str.length);
          return Err(TypeError("String too short"));
        };
        const ok = Ok("thing!") as Result<string, Error>;

        const chained = ok.andThen(processString);

        assertType<IsExact<typeof chained, Result<number, TypeError | Error>>>(
          true,
        );
        assertStrictEquals(chained.isOk(), true);
        assertStrictEquals(chained.unwrap(), 6);
      },
    );

    await t.step(".andThen() -> flattens nested Result instance", () => {
      const nested = Ok(Ok(42)) as Result<Result<number, TypeError>, Error>;

      const flattened = nested.andThen((res) => res);

      assertType<IsExact<typeof flattened, Result<number, TypeError | Error>>>(
        true,
      );
      assertStrictEquals(flattened.isOk(), true);
      assertStrictEquals(flattened.unwrap(), 42);
    });

    await t.step(".orElse() -> short-circuits and returns immediately", () => {
      const recover = function (e: Error): Result<string, never> {
        const recovered = e.cause as string ?? "xDefaultx";
        return Ok(recovered);
      };

      const ok = Ok("thing") as Result<string, Error>;

      const chained = ok.orElse(recover);

      assertType<IsExact<typeof chained, Result<string, never>>>(true);
      assertStrictEquals(chained, ok);
      assertStrictEquals(chained.isOk(), true);
      assertStrictEquals(chained.unwrap(), "thing");
    });

    await t.step(
      ".trip() -> returns a new Err instance upon failure of tripFn",
      () => {
        const checkIfEven = function (n: number): Result<Empty, TypeError> {
          if (n % 2 === 0) return Ok.empty();
          return Err(TypeError());
        };

        const ok = Ok(41) as Result<number, Error>;

        const tripped = ok.trip(checkIfEven);

        assertType<IsExact<typeof tripped, Result<number, Error | TypeError>>>(
          true,
        );
        assertStrictEquals(tripped.isErr(), true);
        assertInstanceOf(tripped.unwrap(), TypeError);
      },
    );

    await t.step(
      ".trip() -> retains original Ok instance upon success of tripFn",
      () => {
        const checkIfEven = function (n: number): Result<Empty, TypeError> {
          if (n % 2 === 0) return Ok.empty();
          return Err(TypeError());
        };

        const ok = Ok(42) as Result<number, Error>;

        const tripped = ok.trip(checkIfEven);

        assertType<IsExact<typeof tripped, Result<number, Error | TypeError>>>(
          true,
        );
        assertStrictEquals(tripped, ok);
        assertStrictEquals(tripped.isOk(), true);
        assertStrictEquals(tripped.unwrap(), 42);
      },
    );

    await t.step(".rise() -> short-circuits and returns immediately", () => {
      const recover = function (e: Error): Result<string, TypeError> {
        const recovered = e.cause as string ?? "xDefaultx";
        return Ok(recovered);
      };

      const ok = Ok("thing") as Result<string, Error>;

      const risen = ok.rise(recover);

      assertType<IsExact<typeof risen, Result<string, Error | TypeError>>>(
        true,
      );
      assertStrictEquals(risen, ok);
      assertStrictEquals(risen.isOk(), true);
      assertStrictEquals(risen.unwrap(), "thing");
    });
  });

  await t.step("Ok<T> -> Combination Methods", async (t) => {
    await t.step(".and() -> returns RHS", () => {
      const lhs = Ok(42);
      const rhs = Err(TypeError()) as Result<string, TypeError>;

      const res = lhs.and(rhs);

      assertType<IsExact<typeof res, Result<string, TypeError>>>(true);
      assertStrictEquals(res, rhs);
      assertStrictEquals(res.isErr(), true);
    });

    await t.step(".or() -> returns LHS", () => {
      const lhs = Ok(42);
      const rhs = Err(TypeError()) as Result<string, TypeError>;

      const res = lhs.or(rhs);

      assertType<IsExact<typeof res, Ok<number>>>(true);
      assertStrictEquals(res, lhs);
      assertStrictEquals(res.isOk(), true);
    });

    await t.step(
      ".zip() -> produces a tuple when zipped with an Ok instance",
      () => {
        const sum = function (...nums: number[]): Result<number, TypeError> {
          const sum = nums.reduce((acc, num) => acc + num, 0);
          return Ok(sum);
        };

        const summandOne = Ok(31);
        const summandTwo = Ok(11);

        const res = summandOne
          .zip(summandTwo)
          .andThen((nums) => sum(...nums));

        assertType<IsExact<typeof res, Result<number, unknown>>>(true);
        assertStrictEquals(res.isOk(), true);
        assertStrictEquals(res.unwrap(), 42);
      },
    );

    await t.step(".zip() -> returns RHS if it is Err", () => {
      const lhs = Ok(42);
      const rhs = Err(TypeError()) as Result<string, TypeError>;

      const res = lhs.zip(rhs);

      assertType<IsExact<typeof res, Result<[number, string], TypeError>>>(
        true,
      );
      assertStrictEquals(res.isErr(), true);
      assertStrictEquals(res, rhs);
    });
  });

  await t.step("Ok<T> -> Unwrap Methods", async (t) => {
    await t.step(".unwrap() -> returns the encapsulated value <T>", () => {
      const ok = Ok(42);
      const res = Ok(42) as Result<number, Error>;

      const num = ok.unwrap();
      const union = res.unwrap();

      assertType<IsExact<typeof num, number>>(true);
      assertType<IsExact<typeof union, number | Error>>(true);
      assertStrictEquals(num, 42);
      assertStrictEquals(union, 42);
    });

    await t.step(".unwrapOr() -> returns the encapsulated value <T>", () => {
      const ok = Ok(42);
      const res = Ok(42) as Result<number, Error>;

      const num = ok.unwrapOr(10);
      const union = res.unwrapOr("thing" as string);

      assertType<IsExact<typeof num, number>>(true);
      assertType<IsExact<typeof union, number | string>>(true);
      assertStrictEquals(num, 42);
      assertStrictEquals(union, 42);
    });

    await t.step(
      ".unwrapOrElse() -> returns the encapsulated value <T>",
      () => {
        const ok = Ok(42);
        const res = Ok(42) as Result<number, Error>;

        const num = ok.unwrapOrElse(() => 10);
        const union = res.unwrapOrElse(() => "thing" as string);

        assertType<IsExact<typeof num, number>>(true);
        assertType<IsExact<typeof union, number | string>>(true);
        assertStrictEquals(num, 42);
        assertStrictEquals(union, 42);
      },
    );
  });

  await t.step("Ok<T> -> Transformation Methods", async (t) => {
    await t.step(".asResult() -> casts Ok<T> to Result<T, never>", () => {
      const ok = Ok(42);
      const res = ok as Result<number, Error>;
      const casted = ok.asResult();

      const withCasted = ok.and(casted);
      const unknownErr = ok.and(ok);
      const castedResult = res.asResult();

      assertType<IsExact<typeof casted, Result<number, never>>>(true);
      assertType<IsExact<typeof withCasted, Result<number, never>>>(true);
      assertType<IsExact<typeof unknownErr, Result<number, unknown>>>(true);
      assertType<IsExact<typeof castedResult, Result<number, Error>>>(true);
      assertStrictEquals(casted, ok);
    });

    await t.step(".toTuple() -> transforms Ok<T> to [T, never]", () => {
      const okRes = Ok(42);
      const res = Ok(42) as Result<number, Error>;

      const okTuple = okRes.toTuple();
      const tuple = res.toTuple();
      const [ok, err] = okRes.toTuple();

      assertType<IsExact<typeof okTuple, [number, never]>>(true);
      assertType<IsExact<typeof tuple, [number, never] | [never, Error]>>(true);
      assertType<IsExact<typeof ok, number>>(true);
      assertType<IsExact<typeof err, never>>(true);
      assertStrictEquals(ok, 42);
      assertStrictEquals(err, undefined);
    });

    await t.step(".ok() -> transforms Ok<T> to Option<T>", () => {
      const res = Ok(42);
      const nullishRes = Ok(undefined);

      const ok = res.ok();
      const notOk = nullishRes.ok();

      assertType<IsExact<typeof ok, Option<number>>>(true);
      assertType<IsExact<typeof notOk, Option<never>>>(true);
      assertStrictEquals(ok.isSome(), true);
      assertStrictEquals(notOk.isSome(), false);
    });

    await t.step(".err() ->transforms Ok<T> to None", () => {
      const res = Ok(42);

      const ok = res.err();

      assertType<IsExact<typeof ok, None>>(true);
      assertStrictEquals(ok.isNone(), true);
    });

    await t.step(".into() -> passes Ok<T> to the supplied intoFn", () => {
      const intoFn = function (res: Result<number, Error>): number {
        return res.unwrapOr(0);
      };
      const err = Ok(42);

      const num = err.into(intoFn);

      assertType<IsExact<typeof num, number>>(true);
      assertStrictEquals(num, 42);
    });
  });

  await t.step("Ok<T> -> Convenience Methods", async (t) => {
    await t.step(".id() -> returns the instance itself", () => {
      const res = Ok(42);

      const ref = res.id();

      assertStrictEquals(ref, res);
    });

    await t.step(
      ".clone() -> returns a new instance with a deep copy of the encapsulated value",
      () => {
        const record = { a: "thing" };
        const ok = Ok(record);

        const clone = ok.clone();

        assertNotStrictEquals(clone, ok);
        assertNotStrictEquals(clone.unwrap(), record);
      },
    );

    await t.step(
      ".tap() -> calls tapFn with a deep copy of the encapsulated value",
      () => {
        /**
         * HOF to capture changes to the original value
         */
        const createTapFn = function <T>(
          originalValue: T,
          originalResult: Ok<T>,
        ): (res: Result<T, unknown>) => void {
          return (res: Result<T, unknown>) => {
            assertNotStrictEquals(originalValue, res.unwrap());
            assertNotStrictEquals(originalResult, res);
            assertEquals(originalValue, res.unwrap());
          };
        };

        const record = { a: "thing" };
        const ok = Ok(record);
        const tapAssertion = createTapFn(record, ok);

        const res = ok.tap(tapAssertion);

        assertStrictEquals(res, ok);
      },
    );

    await t.step(
      ".inspect() -> calls the provided inspectFn with the encapsulated value",
      () => {
        const createInspectFn = function <T>(
          originalValue: T,
        ): (value: T) => void {
          return (value: T) => {
            assertStrictEquals(value, originalValue);
          };
        };
        const record = { a: "thing" };
        const ok = Ok(record);
        const inspectAssertion = createInspectFn(record);

        const res = ok.inspectErr(inspectAssertion);

        assertStrictEquals(res, ok);
      },
    );

    await t.step(
      ".inspectErr() -> short-circuits and returns immediately",
      () => {
        let count = 0;
        const inspectFn = () => {
          count += 1;
        };
        const ok = Ok(1);

        const res = ok.inspectErr(inspectFn);

        assertStrictEquals(res, ok);
        assertStrictEquals(count, 0);
      },
    );
  });

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
  await t.step("Err<E> -> Type Predicates", async (t) => {
    await t.step(".isOk() -> narrows to Ok by returning false", () => {
      const res = Err(TypeError()) as Result<number, TypeError>;

      if (res.isOk()) {
        assertType<IsExact<typeof res, Ok<number>>>(true);
      }

      assertStrictEquals(res.isOk(), false);
    });

    await t.step(".isErr() -> narrows to Err by returning true", () => {
      const res = Err(TypeError()) as Result<number, TypeError>;

      if (res.isErr()) {
        assertType<IsExact<typeof res, Err<TypeError>>>(true);
      }

      assertStrictEquals(res.isErr(), true);
    });
  });

  await t.step("Err<E> -> Map Methods", async (t) => {
    await t.step(".map() -> short-circuits and returns immediately", () => {
      const double = (n: number) => n * 2;
      const err = Err("thing") as Result<number, string>;

      const mapped = err.map(double);

      assertType<IsExact<typeof mapped, Result<number, string>>>(true);
      assertStrictEquals(mapped, err);
      assertStrictEquals(mapped.isErr(), true);
      assertStrictEquals(mapped.unwrap(), "thing");
    });

    await t.step(
      ".mapOr() -> returns new instance of Ok with supplied orValue",
      () => {
        const fallback = 10;
        const toNumber = (str: string) => str.length;
        const err = Err(Error()) as Result<string, Error>;

        const mapped = err.mapOr(toNumber, fallback);

        assertType<IsExact<typeof mapped, Ok<number>>>(true);
        assertStrictEquals(mapped.isOk(), true);
        assertStrictEquals(mapped.unwrap(), 10);
      },
    );

    await t.step(
      ".mapOrElse() -> returns new instance of Ok with return value of elseFn",
      () => {
        const fallback = () => 10;
        const toNumber = (str: string) => str.length;
        const err = Err(Error());

        const mapped = err.mapOrElse(toNumber, fallback);

        assertType<IsExact<typeof mapped, Ok<number>>>(true);
        assertStrictEquals(mapped.isOk(), true);
        assertStrictEquals(mapped.unwrap(), 10);
      },
    );

    await t.step(
      ".mapErr() -> returns new instance of Err with the supplied mapFn",
      () => {
        const toTypeError = (e: Error) =>
          TypeError("Something went wrong", { cause: e });
        const err = Err(Error()) as Result<number, Error>;

        const mapped = err.mapErr(toTypeError);

        assertType<IsExact<typeof mapped, Result<number, TypeError>>>(true);
        assertStrictEquals(mapped.isErr(), true);
        assertNotStrictEquals(mapped, err);
      },
    );

    await t.step(".andThen() -> short-circuits and returns immediately", () => {
      const processString = function (str: string): Result<number, TypeError> {
        if (str.length > 5) return Ok(str.length);
        return Err(TypeError("String too short"));
      };

      const err = Err(Error()) as Result<string, Error>;

      const chained = err.andThen(processString);

      assertType<IsExact<typeof chained, Result<number, Error | TypeError>>>(
        true,
      );
      assertStrictEquals(chained, err);
    });

    await t.step(
      ".orElse() -> returns new instance of Result with the supplied elseFn",
      () => {
        const recover = function (e: Error): Result<string, never> {
          const recovered = e.cause as string ?? "xDefaultx";
          return Ok(recovered);
        };

        const err = Err(Error()) as Result<string, Error>;

        const chained = err.orElse(recover);

        assertType<IsExact<typeof chained, Result<string, never>>>(true);
        assertNotStrictEquals(chained, err);
        assertStrictEquals(chained.isOk(), true);
      },
    );

    await t.step(".orElse() -> flattens nested Result instance", () => {
      const nested = Err(Err(Error())) as Result<string, Result<number, Error>>;

      const flattened = nested.orElse((res) => res);

      assertType<IsExact<typeof flattened, Ok<string> | Result<number, Error>>>(
        true,
      );
      assertStrictEquals(flattened.isErr(), true);
    });

    await t.step(".trip() -> short-circuits and returns immediately", () => {
      let count = 0;
      const noop = function (): Result<Empty, TypeError> {
        count += 1;
        return Ok.empty();
      };

      const err = Err(Error()) as Result<string, Error>;

      const tripped = err.trip(noop);

      assertType<IsExact<typeof tripped, Result<string, Error | TypeError>>>(
        true,
      );
      assertStrictEquals(count, 0);
      assertStrictEquals(tripped, err);
    });

    await t.step(
      ".rise() -> returns the new Ok instance upon success of riseFn",
      () => {
        const recover = function (e: Error): Result<string, TypeError> {
          const recovered = e.cause as string ?? "xDefaultx";
          return Ok(recovered);
        };

        const err = Err(Error()) as Result<number, Error>;

        const risen = err.rise(recover);

        assertType<IsExact<typeof risen, Ok<string> | Result<number, Error>>>(
          true,
        );
        assertStrictEquals(risen.isOk(), true);
      },
    );

    await t.step(
      "rise() -> passes on the original Err variant if riseFn fails",
      () => {
        const recover = function (_: Error): Result<string, TypeError> {
          return Err(TypeError());
        };

        const err = Err(Error()) as Result<number, Error>;

        const risen = err.rise(recover);

        assertType<IsExact<typeof risen, Ok<string> | Result<number, Error>>>(
          true,
        );
        assertStrictEquals(risen.isErr(), true);
        assertStrictEquals(risen, err);
      },
    );
  });

  await t.step("Err<E> -> Combination Methods", async (t) => {
    await t.step(".and() -> returns LHS", () => {
      const lhs = Err(Error());
      const rhs = Ok(42) as Result<number, TypeError>;

      const res = lhs.and(rhs);

      assertType<IsExact<typeof res, Err<Error>>>(true);
      assertStrictEquals(res, lhs);
      assertStrictEquals(res.isErr(), true);
    });

    await t.step(".or() -> returns RHS", () => {
      const lhs = Err(Error());
      const rhs = Ok(42) as Result<number, TypeError>;

      const res = lhs.or(rhs);

      assertType<IsExact<typeof res, Result<number, TypeError>>>(true);
      assertStrictEquals(res, rhs);
      assertStrictEquals(res.isOk(), true);
    });

    await t.step(".zip() -> returns LHS", () => {
      const lhs = Err(Error());
      const rhs = Ok(42) as Result<number, TypeError>;

      const res = lhs.zip(rhs);

      assertType<IsExact<typeof res, Err<Error>>>(true);
      assertStrictEquals(res, lhs);
      assertStrictEquals(res.isErr(), true);
    });
  });

  await t.step("Err<E> -> Unwrap Methods", async (t) => {
    await t.step(".unwrap() -> returns encapsulated value <E>", () => {
      const err = Err("Oh no");
      const res = Err("Oh no") as Result<number, string>;

      const str = err.unwrap();
      const union = res.unwrap();

      assertType<IsExact<typeof str, string>>(true);
      assertType<IsExact<typeof union, number | string>>(true);
      assertStrictEquals(str, "Oh no");
      assertStrictEquals(union, "Oh no");
    });

    await t.step(".unwrapOr() -> returns the provided orValue", () => {
      const err = Err("Oh no");
      const res = Err("Oh no") as Result<number, string>;

      const num = err.unwrapOr(42 as number);
      const union = res.unwrapOr(true as boolean);

      assertType<IsExact<typeof num, number>>(true);
      assertType<IsExact<typeof union, number | boolean>>(true);
      assertStrictEquals(num, 42);
      assertStrictEquals(union, true);
    });

    await t.step(
      ".unwrapOrElse() -> returns the return value of the provided elseFn",
      () => {
        const err = Err("Oh no");
        const res = Err("Oh no") as Result<number, string>;

        const num = err.unwrapOrElse(() => 42 as number);
        const union = res.unwrapOrElse(() => true as boolean);

        assertType<IsExact<typeof num, number>>(true);
        assertType<IsExact<typeof union, number | boolean>>(true);
        assertStrictEquals(num, 42);
        assertStrictEquals(union, true);
      },
    );
  });

  await t.step("Err<E> -> Transformation Methods", async (t) => {
    await t.step(".asResult() -> casts Err<E> to Result<never, E>", () => {
      const err = Err(Error());
      const casted = err.asResult();

      const withCasted = err.or(casted);
      const unknownOk = err.or(err);

      assertType<IsExact<typeof withCasted, Result<never, Error>>>(true);
      assertType<IsExact<typeof unknownOk, Result<unknown, Error>>>(true);
      assertStrictEquals(withCasted, unknownOk);
    });

    await t.step(".toTuple() -> transforms Err<E> to [never, E]", () => {
      const errInstance = Error();
      const errRes = Err(errInstance);

      const tuple = errRes.toTuple();
      const [ok, err] = errRes.toTuple();

      assertType<IsExact<typeof tuple, [never, Error]>>(true);
      assertType<IsExact<typeof ok, never>>(true);
      assertType<IsExact<typeof err, Error>>(true);
      assertStrictEquals(ok, undefined);
      assertStrictEquals(err, errInstance);
    });

    await t.step(".ok() -> transforms Err<E> to None", () => {
      const res = Err(Error());

      const err = res.ok();

      assertType<IsExact<typeof err, None>>(true);
      assertStrictEquals(err.isNone(), true);
    });

    await t.step(".err() -> transforms Err<E> to Option<E>", () => {
      const res = Err(42);
      const nullishRes = Err(undefined);

      const err = res.err();
      const notErr = nullishRes.err();

      assertType<IsExact<typeof err, Option<number>>>(true);
      assertType<IsExact<typeof notErr, Option<never>>>(true);
      assertStrictEquals(err.isSome(), true);
      assertStrictEquals(notErr.isSome(), false);
    });

    await t.step(".into() -> passes Err<E> to the supplied intoFn", () => {
      const intoFn = function (res: Result<number, Error>): number {
        return res.unwrapOr(0);
      };
      const err = Err(Error());

      const num = err.into(intoFn);

      assertType<IsExact<typeof num, number>>(true);
      assertStrictEquals(num, 0);
    });
  });

  await t.step("Err<E> -> Convenience Methods", async (t) => {
    await t.step(".id() -> returns the instance itself", () => {
      const res = Err(1);

      const ref = res.id();

      assertType<IsExact<typeof ref, typeof res>>(true);
      assertStrictEquals(ref, res);
    });

    await t.step(
      ".clone(), -> returns a new instance with a deep copy of the encapsulated value",
      () => {
        const record = { a: "thing" };
        const err = Err(record);

        const clone = err.clone();

        assertNotStrictEquals(clone, err);
        assertNotStrictEquals(clone.unwrap(), record);
      },
    );

    await t.step(
      ".tap() -> calls the tapFn with a deep clone of the encapsulated value",
      () => {
        /**
         * HOF to capture changes to the original value
         */
        const createTapFn = function <E>(
          originalValue: E,
          originalResult: Err<E>,
        ): (res: Result<unknown, E>) => void {
          return (res: Result<unknown, E>) => {
            assertNotStrictEquals(originalValue, res.unwrap());
            assertNotStrictEquals(originalResult, res);
            assertEquals(originalValue, res.unwrap());
          };
        };

        const record = { a: "thing" };
        const err = Err(record);
        const tapAssertion = createTapFn(record, err);

        const res = err.tap(tapAssertion);

        assertStrictEquals(res, err);
      },
    );

    await t.step(".inspect() -> short-circuits and returns immediately", () => {
      let count = 0;
      const inspectFn = () => {
        count += 1;
      };
      const err = Err(1);

      const res = err.inspect(inspectFn);

      assertStrictEquals(res, err);
      assertStrictEquals(count, 0);
    });

    await t.step(
      ".inspectErr() -> calls the provided inspectFn with the encapsulated value",
      () => {
        const createInspectFn = function <E>(
          originalValue: E,
        ): (value: E) => void {
          return (value: E) => {
            assertStrictEquals(value, originalValue);
          };
        };
        const record = { a: "thing" };
        const err = Err(record);
        const inspectAssertion = createInspectFn(record);

        const res = err.inspectErr(inspectAssertion);

        assertStrictEquals(res, err);
      },
    );
  });

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
