import { None, Option, Some } from "./option.ts";
import {
  AssertFalse,
  assertStrictEquals,
  AssertTrue,
  Has,
  IsExact,
  IsNullable,
  NotHas,
} from "../../dev_deps.ts";

type IsOption<O> = O extends Option<unknown> ? true : false;
type OptionType<O> = O extends Option<infer T> ? T : never;
type SomeType<S extends Option<unknown>> = S extends Some<infer T> ? T : never;

Deno.test("eitherway::Option::TypeTests", async (t) => {
  await t.step(
    "Option.from -> Nullish types stripped from inner return type",
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
    "Option.fromFallible -> Nullish and Error types stripped from inner return type",
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
    "Option.fromCoercible -> Falsy types stripped from inner return type",
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
    "Option.fromCoercible -> Falsy types stripped from inner union return type",
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
});

Deno.test("eitherway::Option::Some::TypeTests", async (t) => {
  await t.step("Some<T> -> Ctor doesn't accept Nullish types", () => {
    type NullishUnion = string | undefined | null;

    /**
     * const nullish = undefined;
     * const maybeNullish = (): NullishUnion => undefined;
     * const notSome = Some(nullish); // -> Doesn't compile
     * const tryMaybe = Some(maybeNullish()); // -> Doesn't compile
     */

    const input = "abc";
    const some = Some(input);

    type ParameterTypeIsNotNullable = AssertFalse<
      IsNullable<Parameters<typeof Some>>
    >;

    assertStrictEquals(some.isSome(), true);
  });

  await t.step("Some<T> -> Logical combinators (&&, ||, ^)", async (t) => {
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

        /**
         * Example: This doesn't compile
         * const mapFn = (n: number): string | undefined => n < 100 : "less" : undefined;
         * const orFn = () => undefined;
         * const fails = Some(99).mapOrElse(mapFn, orFn);
         *                                  ^^^^^  ^^^^^
         */

        assertStrictEquals(res.unwrap(), undefined);
        assertStrictEquals(res.isNone(), true);
      },
    );
  });

  await t.step("Unwrap Methods", async (t) => {
    await t.step(".unwrap() -> Return type is T or Nullish union (T | undefined)", () => {
      const some = Some(123);
      const someRes = some.unwrap();
      const opt = Option.from(123 as number | undefined) 
      const optRes = opt.unwrap();

      type UnwrappedSomeIsNotNullable = AssertFalse<IsNullable<typeof someRes>>;
      type UnwrappedOptionIsNullable = AssertTrue<IsNullable<typeof optRes>>;
      type UnwrappedOptionIsUnion = AssertTrue<IsExact<typeof optRes, number | undefined>>;

      assertStrictEquals(someRes, optRes);
    });
    await t.step(".unwrapOr() -> Return type is T or union (T | U)", () => {
      const some = Some(123);
      const someRes = some.unwrapOr("123" as string);
      const opt = Option.from(123 as number | undefined) 
      const optRes = opt.unwrapOr("123" as string);

      type UnwrappedSomeIsNotNullable = AssertFalse<IsNullable<typeof someRes>>;
      type UnwrappedSomeIsExact = AssertTrue<IsExact<typeof someRes, number>>
      type UnwrappedOptionIsNotNullable = AssertFalse<IsNullable<typeof optRes>>;
      type UnwrappedOptionIsUnion = AssertTrue<IsExact<typeof optRes, number | string>>;

      assertStrictEquals(someRes, optRes);
    });
    await t.step(".unwrapOrElse() -> Return type is T or union (T | U)", () => {
      const some = Some(123);
      const someRes = some.unwrapOrElse(() => "123" as string);
      const opt = Option.from(123 as number | undefined) 
      const optRes = opt.unwrapOrElse(() => "123" as string);

      type UnwrappedSomeIsNotNullable = AssertFalse<IsNullable<typeof someRes>>;
      type UnwrappedSomeIsExact = AssertTrue<IsExact<typeof someRes, number>>
      type UnwrappedOptionIsNotNullable = AssertFalse<IsNullable<typeof optRes>>;
      type UnwrappedOptionIsUnion = AssertTrue<IsExact<typeof optRes, number | string>>;

      assertStrictEquals(someRes, optRes);
    });
  });
});
