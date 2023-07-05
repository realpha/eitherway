import {
  assertEquals,
  assertStrictEquals,
} from "../../dev_deps.ts";
import { None, Option, Some } from "./option.ts";

const str = "abc";
const num = -123;
const bnum = 6n;
const inf = Infinity;
const b = true;
const arr = [1,2,3];
const rec = { a: "a", b: 42 };
const sym = Symbol("from::test");
const date = new Date();

const emptyStr = "";
const zero = 0;
const bnZero = 0n;

const err = new Error("test::error");


const falsyNotNullish = [false, NaN, emptyStr, zero, bnZero];
const nullish = [null, undefined];

const allTruthy = [str, num, bnum, inf, b, arr, rec, sym, date];
// @ts-ignore-lines TS cannot match these heterogenous arrays 
const allInfallable = allTruthy.concat(falsyNotNullish);
// @ts-ignore-lines TS cannot match these heterogenous arrays 
const allNonNullish = allInfallable.concat([err]);
// @ts-ignore-lines TS cannot match these heterogenous arrays 
const allFalsy = falsyNotNullish.concat(nullish);
// @ts-ignore-lines TS cannot match these heterogenous arrays 
const allFallable = nullish.concat([err]);



Deno.test("eitherway::Option", async (t) => {
  await t.step("Option.from -> returns Some for NonNullish values", () => {
    allNonNullish.forEach(val => {
      const some = Option.from(val);

      assertEquals(some.isSome(), true, `${String(val)} should be Some`);
      assertEquals(some.isNone(), false, `${String(val)} should be Some`);
      assertStrictEquals(some.unwrap(), val);
    });
  });
  await t.step("Option.from -> returns None for Nullish values", () => {
    nullish.forEach(val => {
      const none = Option.from(val);

      assertEquals(none.isSome(), false, `${String(val)} should be None`);
      assertEquals(none.isNone(), true, `${String(val)} should be None`);
      assertStrictEquals(none.unwrap(), undefined);
    });
  });
  await t.step("Option.fromFallabe -> returns Some for Truthy and FalsyNotNullish values", () => {
    allInfallable.forEach(val => {
      const some = Option.fromFallable(val);

      assertEquals(some.isSome(), true, `${String(val)} should be Some`);
      assertEquals(some.isNone(), false, `${String(val)} should be Some`);
      assertStrictEquals(some.unwrap(), val);
    });
  });
  await t.step("Option.fromFallabe -> returns None for Nullish and Error values", () => {
    allFallable.forEach(val => {
      const none = Option.fromFallable(val);

      assertEquals(none.isSome(), false, `${String(val)} should be None`);
      assertEquals(none.isNone(), true, `${String(val)} should be None`);
      assertStrictEquals(none.unwrap(), undefined);
    });
  });
  await t.step("Option.fromFalsy -> returns Some for Truthy values", () => {
    allTruthy.forEach(val => {
      const some = Option.fromFalsy(val);

      assertEquals(some.isSome(), true, `${String(val)} should be Some`);
      assertEquals(some.isNone(), false, `${String(val)} should be Some`);
      assertStrictEquals(some.unwrap(), val);
    });
  });
  await t.step("Option.fromFalsy -> returns None for Falsy values", () => {
    allFalsy.forEach(val => {
      const none = Option.fromFalsy(val);

      assertEquals(none.isSome(), false, `${String(val)} should be None`);
      assertEquals(none.isNone(), true, `${String(val)} should be None`);
      assertStrictEquals(none.unwrap(), undefined);
    });
  });
});
