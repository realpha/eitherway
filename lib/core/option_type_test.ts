import { None, Option, Some } from "./option.ts";
import {
  AssertFalse,
  assertNotStrictEquals,
  assertStrictEquals,
  AssertTrue,
  Has,
  IsExact,
  IsNullable,
  NotHas,
} from "../../dev_deps.ts";

type OptionValueType<O> = O extends Option<infer T> ? T : never;

Deno.test("eitherway::Option::TypeTests", async (t) => {
  await t.step(
    "Option.from -> Nullish types stripped from inner return type",
    () => {
      const input: string | undefined | null = "abc";
      const option = Option.from(input);

      type returnTypeIsNullable = AssertFalse<
        IsNullable<OptionValueType<typeof option>>
      >;
      assertStrictEquals(option.isSome(), true);
    },
  );

  await t.step(
    "Option.fromFallable -> Nullish and Error types stripped from inner return type",
    () => {
      const input: string | null | undefined | Error = "abc";
      const option = Option.fromFallable(input);

      type returnTypeIsInfallable = AssertTrue<
        IsExact<typeof option, Option<string>>
      >;
      assertStrictEquals(option.isSome(), true);
    },
  );

  await t.step(
    "Option.fromFalsy -> Falsy types stripped from inner return type",
    () => {
      const input: number | "" | false | 0 = NaN;
      const option = Option.fromFalsy(input);

      type returnTypeIsTruthy = AssertTrue<
        IsExact<typeof option, Option<number>>
      >;
      assertStrictEquals(option.isSome(), false);
    },
  );

  await t.step(
    "Option.FromFalsy -> Falsy types stripped from inner union return type",
    () => {
      type LiteralUnion = "a" | "b" | "c" | "" | 0;
      const input: LiteralUnion = "a";
      const option = Option.fromFalsy(input as LiteralUnion);

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
    await t.step(".and -> Return type is inferred fron RHS", () => {
      const lhs = Some("abc");
      const rhs = Some(123) as Option<number>;
      const res = lhs.and(rhs);

      type IsInferredFromRhs = AssertTrue<
        IsExact<OptionValueType<typeof rhs>, OptionValueType<typeof res>>
      >;

      assertStrictEquals(rhs.unwrap(), res.unwrap());
    });
  });
});
