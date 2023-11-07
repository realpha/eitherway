import type { InferredOptionTypes, InferredSomeType } from "./option.ts";
import { None, Option, Options, Some } from "./option.ts";
import type { NonNullish } from "./type_utils.ts";
import {
  AssertFalse,
  assertStrictEquals,
  AssertTrue,
  assertType,
  Has,
  IsExact,
  IsNullable,
} from "../../dev_deps.ts";

type IsOption<O> = O extends Option<unknown> ? true : false;
type OptionType<O> = O extends Option<infer T> ? T : never;
type SomeType<S extends Readonly<Option<unknown>>> = S extends
  Readonly<Some<infer T>> ? T : never;

Deno.test("eitherway::Option::TypeHelpers::TypeTests", async (t) => {
  await t.step(
    "InferredOptionTypes<O> -> Inferres T[] from Option<T>[]",
    () => {
      type StrictTuple = Readonly<[string, number, boolean]>;
      const correctTuple = [
        Option("some" as string),
        Some(1 as number),
        Option(true as boolean),
      ] as const;

      assertType<
        IsExact<InferredOptionTypes<typeof correctTuple>, StrictTuple>
      >(true);
    },
  );

  await t.step("InferredSomeType<O> -> Inferres T from Option<T>", () => {
    type StrictOption = Readonly<Option<number[]>>;
    type NormalOption = Option<Record<string, string>>;

    assertType<IsExact<InferredSomeType<StrictOption>, number[]>>(true);
    assertType<IsExact<InferredSomeType<NormalOption>, Record<string, string>>>(
      true,
    );
  });
});

Deno.test("eitherway::Option::TypeTests", async (t) => {
  await t.step(
    "Option.from() -> Nullish types stripped from inner return type",
    () => {
      const input: string | undefined | null = "abc";
      const option = Option.from(input);

      type returnTypeIsNullable = AssertFalse<
        IsNullable<OptionType<typeof option>>
      >;

      assertStrictEquals(option.isSome(), true);
    },
  );

  await t.step(
    "Option.fromFallible() -> Nullish and Error types stripped from inner return type",
    () => {
      const input: string | null | undefined | Error = "abc";
      const option = Option.fromFallible(input);

      type returnTypeIsInfallable = AssertTrue<
        IsExact<typeof option, Option<string>>
      >;
      assertStrictEquals(option.isSome(), true);
    },
  );

  await t.step(
    "Option.fromCoercible() -> Falsy types stripped from inner return type",
    () => {
      const input: number | "" | false | 0 = NaN;
      const option = Option.fromCoercible(input);

      type returnTypeIsTruthy = AssertTrue<
        IsExact<typeof option, Option<number>>
      >;
      assertStrictEquals(option.isSome(), false);
    },
  );

  await t.step(
    "Option.fromCoercible() -> Falsy types stripped from inner union return type",
    () => {
      type LiteralUnion = "a" | "b" | "c" | "" | 0;
      const input: LiteralUnion = "a";
      const option = Option.fromCoercible(input as LiteralUnion);

      type returnTypePreservesTruthyUnion = AssertTrue<
        IsExact<typeof option, Option<"a" | "b" | "c">>
      >;

      assertStrictEquals(option.isSome(), true);
    },
  );


  await t.step(
    "Option.identity() -> identity type is correctly inferred",
    () => {
      const opt = Option("some");
      const nested = Option(opt);
      const strict = Option("some") as Readonly<Option<string>>;

      const identity = Option.id(opt);
      const nestedIdentity = Option.id(nested);
      const strictIdentity = Option.id(strict);

      assertType<IsExact<typeof identity, Option<string>>>(true);
      assertType<IsExact<typeof nestedIdentity, Option<Option<string>>>>(true);
      assertType<IsExact<typeof strictIdentity, Option<string>>>(true);
    },
  );

  await t.step("Option.lift() -> Fn type is correctly inferred", () => {
    const isNonZeroInt = (n: number): boolean | undefined => {
      if (Number.isSafeInteger(n) && n > 0) return true;
      return false;
    };

    const isNotFortyTwo = function (
      n: number,
    ): boolean | undefined | Error | TypeError {
      if (n === 42) return Error("Cannot be 42");
      return isNonZeroInt(n);
    };

    const lifted = Option.lift(isNonZeroInt);
    const liftedWithCoercible = Option.lift(isNonZeroInt, Option.fromCoercible);
    const liftedWithFallible = Option.lift(isNotFortyTwo, Option.fromFallible);

    assertType<IsExact<typeof lifted, (n: number) => Option<boolean>>>(true);
    assertType<
      IsExact<typeof liftedWithCoercible, (n: number) => Option<true>>
    >(true);
    assertType<
      IsExact<typeof liftedWithFallible, (n: number) => Option<boolean>>
    >(true);
  });

  await t.step(
    "Option.lift() -> Fn type is correctly inferred from custom Option ctor",
    () => {
      type Left<L> = { tag: "Left"; value: L };
      type Right<R> = { tag: "Right"; value: R };
      type Either<L, R> = Left<L> | Right<R>;
      type Numeric<T> = T extends number | bigint ? T : never;
      type NonNumeric<T> = NonNullish<Exclude<T, Numeric<T>>>;
      function isNonNumeric<T>(arg: T): arg is NonNumeric<T> {
        if (arg == null || typeof arg === "number" || typeof arg === "bigint") {
          return false;
        }
        return true;
      }

      function fromEither<L, R>(
        e?: Either<L, R>,
      ): Option<NonNumeric<R>> {
        if (e?.tag === "Right" && isNonNumeric(e?.value)) return Some(e.value);
        return None;
      }

      function tupleToEither(
        arg: Readonly<[string, number | boolean]>,
      ): Either<typeof arg[0], typeof arg[1]> {
        return { tag: "Right", value: arg[1] };
      }

      const lifted = Option.lift(tupleToEither, fromEither);

      assertType<
        IsExact<Parameters<typeof lifted>, Parameters<typeof tupleToEither>>
      >(true);
      assertType<
        IsExact<
          ReturnType<typeof lifted>,
          ReturnType<typeof fromEither<string, number | boolean>>
        >
      >(true);
    },
  );
});

Deno.test("eitherway::Options::TypeTests", async (t) => {
  await t.step(
    ".all() -> Heterogenous tuple types are correctly inferred",
    () => {
      type TestTuple = Readonly<[string, number, { a: number[] }]>;
      const optionTuple = [
        Option("abc" as string),
        Option(100 as number),
        Option({ a: [] } as { a: number[] }),
      ] as const;
      const someTuple = [
        Some("abc" as string),
        Some(100 as number),
        Some({ a: [] } as { a: number[] }),
      ] as const;

      const collectedOpts = Options.all(optionTuple);
      const collectedSomes = Options.all(someTuple);

      if (collectedOpts.isSome() && collectedSomes.isSome()) {
        const unwrappedOpts = collectedOpts.unwrap();
        const unwrappedSomes = collectedSomes.unwrap();

        assertType<IsExact<typeof unwrappedOpts, TestTuple>>(true);
        assertType<IsExact<typeof unwrappedSomes, TestTuple>>(true);
      } else {
        throw TypeError("Unreachable");
      }
    },
  );

  await t.step(
    ".all() -> Array types are correctly inferred and retain constraints",
    () => {
      type TestArray = ReadonlyArray<string>;
      type TestArrayMut = Array<string>;
      const optArray: ReadonlyArray<Option<string>> = Array.of(..."option").map(
        (
          char,
        ) => Option(char),
      );
      const optArrayMut: Array<Option<string>> = Array.of(..."option").map((
        char,
      ) => Option(char));

      const collected = Options.all(optArray);
      const collectedMut = Options.all(optArrayMut);

      if (collected.isSome() && collectedMut.isSome()) {
        const unwrapped = collected.unwrap();
        const unwrappedMut = collectedMut.unwrap();

        assertType<IsExact<typeof unwrapped, TestArray>>(true);
        assertType<IsExact<typeof unwrappedMut, TestArrayMut>>(true);
      } else {
        throw TypeError("Unreachable");
      }
    },
  );
});

Deno.test("eitherway::Option::Some::TypeTests", async (t) => {
  await t.step("Some<T> -> Ctor doesn't accept Nullish types", () => {
    type NullishUnion = string | undefined | null;

    /**
     * These examples don't compile:
     *
     * const nullish = undefined;
     * const maybeNullish = (): NullishUnion => undefined;
     *
     * const notSome = Some(nullish);
     *                      ^^^^^^^
     * const tryMaybe = Some(maybeNullish());
     *                       ^^^^^^^^^^^^^^
     */

    const input = "abc";
    const some = Some(input);

    type ParameterTypeIsNotNullable = AssertFalse<
      IsNullable<Parameters<typeof Some>>
    >;
    type ParameterTypeCannotBeNullishUnion = AssertFalse<
      Has<Parameters<typeof Some>, NullishUnion>
    >;

    assertStrictEquals(some.isSome(), true);
  });

  await t.step("Some<T> -> Type predicate narrows to Some", () => {
    const opt = Option.from("abc" as string | undefined);

    if (opt.isSome()) {
      const str = opt.unwrap();

      type IsString = AssertTrue<IsExact<typeof str, string>>;
    }

    const union = opt.unwrap();

    type IsUnion = AssertTrue<IsExact<typeof union, string | undefined>>;

    assertStrictEquals(opt.isSome(), true);
  });

  await t.step("Some<T> -> Logical Combinators (&&, ||, ^)", async (t) => {
    await t.step(".and() -> Return type is inferred from RHS", () => {
      const lhs = Some("abc");
      const rhs = Some(123);
      const res = lhs.and(rhs);

      type IsInferredFromRhs = AssertTrue<
        IsExact<SomeType<typeof rhs>, SomeType<typeof res>>
      >;

      assertStrictEquals(rhs.unwrap(), res.unwrap());
    });
    await t.step(".or() -> Return type is inferred from LHS", () => {
      const lhs = Some("abc");
      const rhs = Some(123);
      const res = lhs.or(rhs);

      type IsInferredFromLhs = AssertTrue<
        IsExact<SomeType<typeof lhs>, SomeType<typeof res>>
      >;

      assertStrictEquals(lhs.unwrap(), res.unwrap());
    });
    await t.step(".xor() -> Return type is inferred from LHS or union", () => {
      const lhs = Some("abc");
      const lhs2 = Option.from("abc");
      const rhs = Option.from(123);
      const res = lhs.xor(rhs);
      const res2 = lhs2.xor(rhs);

      type IsInferredFromLhs = AssertTrue<
        IsExact<SomeType<typeof res>, SomeType<typeof lhs>>
      >;
      type InnerIsInferredAsUnion = AssertTrue<
        IsExact<SomeType<typeof res2>, string | number>
      >;
      type IsInferredAsUnion = AssertTrue<
        IsExact<typeof res2, typeof lhs2 | typeof rhs>
      >;

      assertStrictEquals(res.isNone(), true);
    });
    await t.step(
      ".and().or().xor() -> Return type from chaining is inferred as union",
      () => {
        const lhs = Some({ a: 1, b: 2 });
        const rhs = Some([1, 2, 3]);
        const rhs2 = Some("abc");
        const rhs3 = Option.from(null);
        const rhs4 = Some(true);
        const rhs5 = Some(123);
        const res = lhs.and(rhs).or(rhs2).xor(rhs3).and(rhs4).xor(rhs5);

        type InnerIsInferredAsUnion = AssertTrue<
          IsExact<SomeType<typeof res>, boolean | number>
        >;
        type IsInferredAsUnion = AssertTrue<
          IsExact<typeof res, Option<boolean> | Option<number>>
        >;

        assertStrictEquals(res.isNone(), true);
      },
    );
  });

  await t.step("Some<T> -> Map Methods", async (t) => {
    await t.step(
      ".map() -> Return type is invariant over Nullish mapFn return types",
      () => {
        const mapFn = (n: number): string => n < 100 ? "lt" : "gte";
        const some = Some(99);
        const someStr = some.map(mapFn);

        type MapMethodReturnType = ReturnType<typeof some["map"]>;

        type IsInvariantOverNullish = AssertFalse<
          IsNullable<OptionType<MapMethodReturnType>>
        >;

        /**
         * Example: This doesn't compile
         * const mapFn = (n: number): string | undefined => n < 100 : "less" : undefined;
         * const fails = Some(99).map(mapFn);
         *                            ^^^^^
         */

        assertStrictEquals(someStr.unwrap(), "lt");
      },
    );
    await t.step(
      ".mapOr() -> Return type is invariant over Nullish mapFn return and orValue types",
      () => {
        const mapFn = (n: number): string => n < 100 ? "lt" : "gte";
        const some = Some(99);
        const someStr = some.mapOr(mapFn, "never");

        type MapOrMethodReturnType = ReturnType<typeof some["mapOr"]>;

        type IsInvariantOverNullish = AssertFalse<
          IsNullable<OptionType<MapOrMethodReturnType>>
        >;

        /**
         * Example: This doesn't compile
         * const mapFn = (n: number): string | undefined => n < 100 : "less" : undefined;
         * const fails = Some(99).mapOr(mapFn, undefined);
         *                              ^^^^^  ^^^^^^^^^
         */

        assertStrictEquals(someStr.unwrap(), "lt");
      },
    );
    await t.step(
      ".mapOrElse() -> Return type is invariant over Nullish mapFn return and orFn return types",
      () => {
        const mapFn = (n: number): string => n < 100 ? "lt" : "gte";
        const orFn = () => "never";
        const some = Some(99);
        const someStr = some.mapOrElse(mapFn, orFn);

        type MapOrElseMethodReturnType = ReturnType<typeof some["mapOrElse"]>;

        type IsInvariantOverNullish = AssertFalse<
          IsNullable<OptionType<MapOrElseMethodReturnType>>
        >;

        /**
         * Example: This doesn't compile
         * const mapFn = (n: number): string | undefined => n < 100 : "less" : undefined;
         * const orFn = () => undefined;
         * const fails = Some(99).mapOrElse(mapFn, orFn);
         *                                  ^^^^^  ^^^^^
         */

        assertStrictEquals(someStr.unwrap(), "lt");
      },
    );
    await t.step(
      ".andThen() -> Return type is always Option (and thus invariant over Nullish)",
      () => {
        const mapFn = (n: number) => Math.max(n, 10);
        const thenFn = (n: number) => Option.fromCoercible(0 * n / 0.00);
        const some = Some(99);
        const res = some.map(mapFn).andThen(thenFn);

        type AndThenParamReturnType = ReturnType<
          Parameters<typeof some["andThen"]>[0]
        >;

        type ReturnTypeIsOption = AssertTrue<IsOption<AndThenParamReturnType>>;
        type IsInvariantOverNullish = AssertFalse<
          IsNullable<OptionType<AndThenParamReturnType>>
        >;

        assertStrictEquals(res.unwrap(), undefined);
        assertStrictEquals(res.isNone(), true);
      },
    );
  });

  await t.step("Some<T> -> Unwrap Methods", async (t) => {
    await t.step(
      ".unwrap() -> Return type is T or Nullish union (T | undefined)",
      () => {
        const some = Some(123);
        const someRes = some.unwrap();
        const opt = Option.from(123 as number | undefined);
        const optRes = opt.unwrap();

        type UnwrappedSomeIsNotNullable = AssertFalse<
          IsNullable<typeof someRes>
        >;
        type UnwrappedOptionIsNullable = AssertTrue<IsNullable<typeof optRes>>;
        type UnwrappedOptionIsUnion = AssertTrue<
          IsExact<typeof optRes, number | undefined>
        >;

        assertStrictEquals(someRes, optRes);
      },
    );
    await t.step(".unwrapOr() -> Return type is T or union (T | U)", () => {
      const some = Some(123);
      const someRes = some.unwrapOr("123" as string);
      const opt = Option.from(123 as number | undefined);
      const optRes = opt.unwrapOr("123" as string);

      type UnwrappedSomeIsNotNullable = AssertFalse<IsNullable<typeof someRes>>;
      type UnwrappedSomeIsExact = AssertTrue<IsExact<typeof someRes, number>>;
      type UnwrappedOptionIsNotNullable = AssertFalse<
        IsNullable<typeof optRes>
      >;
      type UnwrappedOptionIsUnion = AssertTrue<
        IsExact<typeof optRes, number | string>
      >;

      assertStrictEquals(someRes, optRes);
    });
    await t.step(".unwrapOrElse() -> Return type is T or union (T | U)", () => {
      const some = Some(123);
      const someRes = some.unwrapOrElse(() => "123" as string);
      const opt = Option.from(123 as number | undefined);
      const optRes = opt.unwrapOrElse(() => "123" as string);

      type UnwrappedSomeIsNotNullable = AssertFalse<IsNullable<typeof someRes>>;
      type UnwrappedSomeIsExact = AssertTrue<IsExact<typeof someRes, number>>;
      type UnwrappedOptionIsNotNullable = AssertFalse<
        IsNullable<typeof optRes>
      >;
      type UnwrappedOptionIsUnion = AssertTrue<
        IsExact<typeof optRes, number | string>
      >;

      assertStrictEquals(someRes, optRes);
    });
  });
});

Deno.test("eitherway::Option::None::TypeTests", async (t) => {
  await t.step("None -> Map Methods", async (t) => {
    await t.step(".map() -> Return type is None", () => {
      const none = None.map(() => "never");

      type IsNone = AssertTrue<IsExact<typeof none, None>>;

      assertStrictEquals(none.isNone(), true);
    });

    await t.step(".filter() -> Narrows type based on supplied typeguard", () => {
      const numOrStr = 0 as string | number;
      const isNum = (value: unknown): value is number => typeof value === "number";

      const none = Option.fromCoercible(numOrStr);
      const same = none.filter(isNum);

      type PriorIsUnion = AssertTrue<IsExact<typeof none, Option<string | number>>>;
      type ReturnTypeIsNarrowed = AssertTrue<IsExact<typeof same, Option<number>>>;

      assertStrictEquals(same.isNone(), true);
    });

    await t.step(".filter() -> Return type is None", () => {
      const isEven = (value: number): boolean => value % 2 === 0;

      const none = None.filter(isEven);

      type IsNone = AssertTrue<IsExact<typeof none, None>>;

      assertStrictEquals(none.isNone(), true);
    });
  });
});
    
