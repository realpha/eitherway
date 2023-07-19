import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertObjectMatch,
  assertStrictEquals,
} from "../../dev_deps.ts";
import { None, Option, Some } from "./option.ts";

/**
 * Setup test value collections
 */

const str = "abc";
const num = -123;
const bnum = 6n;
const inf = Infinity;
const b = true;
const arr = [1, 2, 3];
const rec = { a: "a", b: 42 };
const sym = Symbol("from::test");
const date = new Date();

const emptyStr = "";
const zero = 0;
const bnZero = 0n;

class Wellknown {
  constructor(public a = 1, public b = 2, private c = 3) {}
  get [Symbol.toStringTag]() {
    return "Well-known symbol and methods";
  }
  [Symbol.toPrimitive](hint: string) {
    if (hint === "string") return this.toString();
    return this.valueOf();
  }
  *[Symbol.iterator]() {
    yield this.a;
    yield this.b;
  }
  toJSON() {
    return { ...this, c: "***" };
  }
  toString() {
    return String(this.a + this.b + this.c);
  }
  valueOf() {
    return this.a + this.b + this.c;
  }
}
const wellknown = new Wellknown();

const err = new Error("test::error");

const falsyNotNullish = [false, NaN, emptyStr, zero, bnZero];
const nullish = [null, undefined];

const allTruthy = [str, num, bnum, inf, b, arr, rec, sym, date, wellknown];
// @ts-ignore-lines These heterogenous arrays break type inference
const allInfallible = allTruthy.concat(falsyNotNullish);
// @ts-ignore-lines These heterogenous arrays break type inference
const allNonNullish = allInfallible.concat([err]);
// @ts-ignore-lines These heterogenous arrays break type inference
const allFalsy = falsyNotNullish.concat(nullish);
// @ts-ignore-lines These heterogenous arrays break type inference
const allFallible = nullish.concat([err]);
// @ts-ignore-lines These heterogenous arrays break type inference
const allValues = allNonNullish.concat(nullish);

Deno.test("eitherway::Option", async (t) => {
  await t.step("Option() -> returns Some for NonNullish values", () => {
    allNonNullish.forEach((val) => {
      const some = Option(val);

      assertEquals(some.isSome(), true, `${String(val)} should be Some`);
      assertEquals(some.isNone(), false, `${String(val)} should be Some`);
      assertStrictEquals(some.unwrap(), val);
    });
  });
  await t.step("Option() -> returns None for Nullish values", () => {
    nullish.forEach((val) => {
      const none = Option(val);

      assertEquals(none.isSome(), false, `${String(val)} should be None`);
      assertEquals(none.isNone(), true, `${String(val)} should be None`);
      assertStrictEquals(none.unwrap(), undefined);
    });
  });
  await t.step("Option.from() -> returns Some for NonNullish values", () => {
    allNonNullish.forEach((val) => {
      const some = Option.from(val);

      assertEquals(some.isSome(), true, `${String(val)} should be Some`);
      assertEquals(some.isNone(), false, `${String(val)} should be Some`);
      assertStrictEquals(some.unwrap(), val);
    });
  });
  await t.step("Option.from() -> returns None for Nullish values", () => {
    nullish.forEach((val) => {
      const none = Option.from(val);

      assertEquals(none.isSome(), false, `${String(val)} should be None`);
      assertEquals(none.isNone(), true, `${String(val)} should be None`);
      assertStrictEquals(none.unwrap(), undefined);
    });
  });
  await t.step(
    "Option.fromFallibe() -> returns Some for Truthy and FalsyNotNullish values",
    () => {
      allInfallible.forEach((val) => {
        const some = Option.fromFallible(val);

        assertEquals(some.isSome(), true, `${String(val)} should be Some`);
        assertEquals(some.isNone(), false, `${String(val)} should be Some`);
        assertStrictEquals(some.unwrap(), val);
      });
    },
  );
  await t.step(
    "Option.fromFallibe() -> returns None for Nullish and Error values",
    () => {
      allFallible.forEach((val) => {
        const none = Option.fromFallible(val);

        assertEquals(none.isSome(), false, `${String(val)} should be None`);
        assertEquals(none.isNone(), true, `${String(val)} should be None`);
        assertStrictEquals(none.unwrap(), undefined);
      });
    },
  );
  await t.step(
    "Option.fromCoercible() -> returns Some for Truthy values",
    () => {
      allTruthy.forEach((val) => {
        const some = Option.fromCoercible(val);

        assertEquals(some.isSome(), true, `${String(val)} should be Some`);
        assertEquals(some.isNone(), false, `${String(val)} should be Some`);
        assertStrictEquals(some.unwrap(), val);
      });
    },
  );
  await t.step(
    "Option.fromCoercible() -> returns None for Falsy values",
    () => {
      allFalsy.forEach((val) => {
        const none = Option.fromCoercible(val);

        assertEquals(none.isSome(), false, `${String(val)} should be None`);
        assertEquals(none.isNone(), true, `${String(val)} should be None`);
        assertStrictEquals(none.unwrap(), undefined);
      });
    },
  );
  await t.step(
    "Option[Symbol.hasInstance] -> instanceof returns true for instances of Some & None",
    () => {
      allValues.forEach((val) => {
        const opt = Option.from(val);

        const isInstance = opt instanceof Option;
        const isNotInstance = !(val instanceof Option);

        assertStrictEquals(isInstance, true);
        assertStrictEquals(isNotInstance, true);
      });
    },
  );
});

Deno.test("eitherway::Option::Some", async (t) => {
  await t.step("Some<T> -> JS well-known symbols and methods", async (t) => {
    await t.step(
      "[Symbol.hasInstance]() -> instanceof returns true for instances of Some",
      () => {
        allNonNullish.forEach((value) => {
          const some = Some(value);
          const ref = value;

          const isSomeInstance = some instanceof Some;
          const isOptionInstance = some instanceof Option;
          const isNotInstance = !(ref instanceof Some);

          assertStrictEquals(isSomeInstance, true);
          assertStrictEquals(isOptionInstance, true);
          assertStrictEquals(isNotInstance, true);
        });

        const noneNeverIsSomeInstance = !(None instanceof Some);

        assertStrictEquals(noneNeverIsSomeInstance, true);
      },
    );
    await t.step(
      "[Symbol.toStringTag]() -> returns FQN and is not nullish",
      () => {
        const someStr = Some("abc");
        const someArr = Some([1, 2, 3]);
        const someRec = Some({ [Symbol.toStringTag]: "TestRecord" });

        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
        const resStatic = Object.prototype.toString.call(Some);
        const resStr = Object.prototype.toString.call(someStr);
        const resArr = Object.prototype.toString.call(someArr);
        const resRec = Object.prototype.toString.call(someRec);

        assertStrictEquals(resStatic, "[object eitherway::Option::Some]");
        assertStrictEquals(resStr, "[object eitherway::Option::Some<abc>]");
        assertStrictEquals(
          resArr,
          "[object eitherway::Option::Some<[object Array]>]",
        );
        assertStrictEquals(
          resRec,
          "[object eitherway::Option::Some<[object TestRecord]>]",
        );
      },
    );
    await t.step(
      "[Symbol.iterator]() -> supports spread operator and conforms iterator protocol",
      () => {
        const num = Some(2);
        const arr = Some([1, 2, 3]);
        const rec = Some({ a: 1 });
        const recNested = { a: 1, num, arr, rec };

        const copy = { ...recNested };
        const copyInner = { ...rec }; // Hint: plain objects don't implement Symbol.iterator
        const copyInnerUnwrapped = { ...(rec.unwrap()) };
        const arrCopy = [...arr];
        const iterResNum = num[Symbol.iterator]().next();
        const iterResRec = rec[Symbol.iterator]().next();

        assertEquals(copy, {
          a: 1,
          num: Some(2),
          arr: Some([1, 2, 3]),
          rec: Some({ a: 1 }),
        });
        assertEquals(copyInner, {});
        assertEquals(copyInnerUnwrapped, { a: 1 });
        assertEquals(arrCopy, [1, 2, 3]);
        assertEquals(iterResNum, { done: true, value: 2 });
        assertEquals(iterResRec, { done: true, value: { a: 1 } });
      },
    );
    await t.step(
      "[Symbol.toPrimitve]() -> supports all hints and delegates to the underlying implementation",
      () => {
        const defaultHint = "default";
        const stringHint = "string";
        const numberHint = "number";
        allNonNullish.filter((value) => !Number.isNaN(value)).forEach(
          (value) => {
            const some = Some(value);
            const ref = Object(value); // Use object cocercion to access the well-known symbols also on primitve values

            if (Symbol.toPrimitive in ref) {
              const someDefaultCoercion = some[Symbol.toPrimitive](defaultHint);
              const refDefaultCoercion = ref[Symbol.toPrimitive](defaultHint);
              const someStringCoercion = some[Symbol.toPrimitive](stringHint);
              const refStringCoercion = ref[Symbol.toPrimitive](stringHint);
              const someNumberCoercion = some[Symbol.toPrimitive](numberHint);
              const refNumberCoercion = ref[Symbol.toPrimitive](numberHint);

              assertStrictEquals(someDefaultCoercion, refDefaultCoercion);
              assertStrictEquals(someStringCoercion, refStringCoercion);
              assertStrictEquals(someNumberCoercion, refNumberCoercion);
            }
          },
        );
      },
    );
    await t.step(
      "toJSON() -> delegates to underlying implementation or returns the value itself",
      () => {
        /**
         * Arrange non-nullish values which can be stringified
         */
        allNonNullish
          .filter((value) => {
            if (typeof value === "bigint") return false;
            if (typeof value === "number" && Number.isNaN(value)) return false;
            return true;
          }).forEach(
            (value) => {
              const someJson = JSON.stringify(Some(value));
              const refJson = JSON.stringify(value);

              assertStrictEquals(someJson, refJson);
            },
          );
      },
    );
    await t.step("toString() -> delegates to underlying implementation", () => {
      allNonNullish.forEach((value) => {
        const someStr = Some(value).toString();
        const str = Object(value).toString();

        assertStrictEquals(someStr, str);
      });
    });
    await t.step("valueOf() -> delegates to underlying implementation", () => {
      allNonNullish.forEach((value) => {
        const someVal = Some(value).valueOf();
        const val = Object(value).valueOf();

        assertStrictEquals(someVal, val);
      });
    });
  });
  await t.step("Some<T> -> Coercions", async (t) => {
    /**
     * Implicit coercions make the JavaScript world go round, but are
     * a constant source of error, confusion and frustration.
     * Luckily, the transpiler will flag most occurences of implicit coercion
     * where a primitive value is expected as error.
     * The following steps are meant to demonstrate and document the
     * behavior of Some<T> in these situations, given a wrapped value
     * of type T.
     * NEVER RELY on this behavior though, it's confusing!
     * USE EXPLICIT methods or default values instead.
     * DISREGARD THIS ADVICE AT YOUR OWN PERIL.
     */
    await t.step(
      'Primitive coercion -> delegates to underlying implementation (ops: binary "+" [string concatenation & addition], loose equality, Date constructor)',
      () => {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion
        const primitiveStr = "This is " +
          Some("nice, but still ") + Some({ weird: "behaviour." });
        //@ts-ignore-lines for testing purposes
        const primitiveSum = 42 + Some(41);
        //@ts-ignore-lines for testing purposes
        const primitiveCmp = 0 == Some(false);
        //@ts-ignore-lines for testing purposes
        const primitiveDate = new Date(Some(false));
        //@ts-ignore-lines for testing purposes
        const thisIsReallyFunny = 0 == Some(None);

        const expectedStr = "This is nice, but still [object Object]"; // coerces to the underlying primitive representations
        const expectedSum = 83; // coerces to the underlying primitive
        const expectedCmp = true; // also here, but false is further coerced to 0 (LOLse equality... what a joke)
        const expectedDate = new Date(0); //Again, false is further coerced to 0

        assertStrictEquals(primitiveStr, expectedStr);
        assertStrictEquals(primitiveSum, expectedSum);
        assertStrictEquals(primitiveCmp, expectedCmp);
        assertStrictEquals(primitiveDate.toString(), expectedDate.toString());
        assertStrictEquals(thisIsReallyFunny, true);
      },
    );
    await t.step(
      "String coercion -> delegates to underlying implementation (ops: template literal, String constructor)",
      () => {
        /**
         * Arrange non-nullish values which can actually be further coerced.
         * Symbols are the only primitive values, where no further coercion can be performed.
         * Therefore Some<Symbol> behaves exactly as Symbol in these situations.
         * ```
         * const sym = Symbol("test");
         * const someSym = Some(sym);
         *
         * assertThrows(() => String(sym));
         * assertThrows(() => String(someSym));
         * ```
         */
        allNonNullish
          .filter((value) => value !== sym)
          .forEach((value) => {
            const some = Some(value);
            const ref = Object(value);

            const tmpl = `${some}`;
            const ctor = String(some);

            const expected = ref.toString();

            assertStrictEquals(tmpl, expected);
            assertStrictEquals(ctor, expected);
          });
      },
    );
      await t.step(
        'Number coercion -> delegates to underlying implementation (ops: unary "+" and Number constructor)',
        () => {
          const sumRhsPlus = 41 + +Some(1);
          const sumLhsPlus = +Some("1") + 41;

          const diffRhsPlus = 43 - +Some(1);
          const diffLhsPlus = +Some("1") - -41;

          const prodRhsPlus = 42 * +Some(1);
          const prodLhsPlus = +Some("1") * 42;

          const quotRhsPlus = 42 / +Some(1);
          const quotLhsPlus = +Some("1") / (1/42);

          const sumRhsCtor = 41 + Number(Some(1));
          const sumLhsCtor = Number(Some("1")) + 41;

          const diffRhsCtor = 43 - Number(Some(1));
          const diffLhsCtor = Number(Some("1")) - -41;

          const prodRhsCtor = 42 * Number(Some(1));
          const prodLhsCtor = Number(Some("1")) * 42;

          const quotRhsCtor = 42 / Number(Some(1));
          const quotLhsCtor = Number(Some("1")) / (1/42);

          assertStrictEquals(sumRhsPlus, 42);
          assertStrictEquals(sumLhsPlus, 42);
          assertStrictEquals(sumRhsCtor, 42);
          assertStrictEquals(sumLhsCtor, 42);
          assertStrictEquals(diffRhsPlus, 42);
          assertStrictEquals(diffLhsPlus, 42);
          assertStrictEquals(diffRhsCtor, 42);
          assertStrictEquals(diffLhsCtor, 42);
          assertStrictEquals(prodRhsPlus, 42);
          assertStrictEquals(prodLhsPlus, 42);
          assertStrictEquals(prodRhsCtor, 42);
          assertStrictEquals(prodLhsCtor, 42);
          assertStrictEquals(quotRhsPlus, 42);
          assertStrictEquals(quotLhsPlus, 42);
          assertStrictEquals(quotRhsCtor, 42);
          assertStrictEquals(quotLhsCtor, 42);
        },
      );
  });
});

Deno.test("eitherway::Option::None", async (t) => {
  await t.step("None -> JS well-known symbols and methods", async (t) => {
    await t.step("[Symbol.hasInstance]() -> instanceof returns true for instances of None", () => {
      allFalsy.forEach(value => {
        const none = Option.fromCoercible(value);
        const ref = Object(value);

        // Typescript doesn't conform the ECMA spec here:
        // https://github.com/microsoft/TypeScript/issues/39064
        //deno-lint-ignore no-explicit-any
        const isNoneInstance = none instanceof (None as any);
        const isOptionInstance = none instanceof Option;
        //deno-lint-ignore no-explicit-any
        const isNotNoneInstance = !(ref instanceof (None as any));

        assertStrictEquals(isNoneInstance, true);
        assertStrictEquals(isOptionInstance, true);
        assertStrictEquals(isNotNoneInstance, true);
      });

      const some = Some("thing");

      //deno-lint-ignore no-explicit-any
      const someIsNeverNoneInstance = !(some instanceof (None as any));
      
      assertStrictEquals(someIsNeverNoneInstance, true);
    });
    await t.step(
      "[Symbol.toStringTag]() -> returns FQN and is not nullish",
      () => {
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
        const res = Object.prototype.toString.call(None);

        assertExists(res);
        assertStrictEquals(res, "[object eitherway::Option::None]");
      },
    );
    await t.step(
      "[Symbol.iterator]() -> supports spread operator and conforms iterator protocol",
      () => {
        const rec = { a: 1, b: None };
        const none = Option.from(undefined);

        const loop = () => {
          let count = 0;
          for (const _item of None) {
            count += 1;
          }
          return count;
        };
        const copy = { ...rec };
        const recSppread = { ...none };
        const arrSpread = [...none];
        const iterCount = loop();
        const iterRes = None[Symbol.iterator]().next();

        assertObjectMatch(copy, { a: 1 });
        assertObjectMatch(recSppread, {});
        assertEquals(arrSpread, []);
        assertStrictEquals(iterCount, 0);
        assertObjectMatch(iterRes, { done: true, value: undefined });
      },
    );
    await t.step(
      "[Symbol.toPrimitve]() -> supports all hints and returns falsy defaults",
      () => {
        const str = None[Symbol.toPrimitive]("string");
        const num = None[Symbol.toPrimitive]("number");
        const def = None[Symbol.toPrimitive]("default");

        assertStrictEquals(str, "");
        assertStrictEquals(num, 0);
        assertStrictEquals(def, false);
      },
    );
    await t.step(
      "toJSON() -> returns undefined, thus being stripped by JSON.stringify()",
      () => {
        const def = None.toJSON();
        const str = JSON.stringify(None);
        const rec = { a: "a", b: None };
        const recStr = JSON.stringify(rec);

        assertStrictEquals(def, undefined);
        assertStrictEquals(str, undefined);
        assertStrictEquals(recStr, '{"a":"a"}');
      },
    );
    await t.step("toString() -> return empty string", () => {
      const str = None.toString();

      assertStrictEquals(str, "");
    });
    await t.step("valueOf() -> returns 0", () => {
      const num = None.valueOf();

      assertStrictEquals(num, 0);
    });
  });

  await t.step("None -> Coercions", async (t) => {
    await t.step(
      'Primitive coercion -> returns false (ops: binary "+" [string concatenation & addition], loose equality, Date constructor)',
      () => {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion
        const primitiveStr = "This is " + None;
        //@ts-ignore-lines for testing purposes
        const primitiveSum = None + 42;
        //@ts-ignore-lines for testing purposes
        const primitiveCmp = 0 == None;
        //@ts-ignore-lines for testing purposes
        const primitiveDate = new Date(None);

        const expectedStr = "This is false"; // false is further coerced to string
        const expectedSum = 42; // false is further coerced to 0
        const expectedCmp = true; // false is further coerced to 0 (LOLse equality... what a joke)
        const expectedDate = new Date(0); //Again, false is further coerced to 0

        assertStrictEquals(primitiveStr, expectedStr);
        assertStrictEquals(primitiveSum, expectedSum);
        assertStrictEquals(primitiveCmp, expectedCmp);
        assertStrictEquals(primitiveDate.toString(), expectedDate.toString());
      },
    );
    await t.step(
      "String coercion -> returns empty string (ops: template literal, String constructor)",
      () => {
        const tmpl = `This is ${None}`;
        const ctor = "This is " + String(None);

        const expected = "This is ";

        assertStrictEquals(
          tmpl,
          expected,
        );
        assertStrictEquals(ctor, expected);
      },
    );
    await t.step(
      'Number coercion -> returns 0 (ops: unary "+" and Number constructor)',
      () => {
        const sumRhsPlus = 42 + +None;
        const sumLhsPlus = +None + 42;

        const diffRhsPlus = 42 - +None;
        const diffLhsPlus = +None - 42;

        const prodRhsPlus = 42 * +None;
        const prodLhsPlus = +None * 42;

        const quotRhsPlus = 42 / +None;
        const quotLhsPlus = +None / 42;

        const sumRhsCtor = 42 + Number(None);
        const sumLhsCtor = Number(None) + 42;

        const diffRhsCtor = 42 - Number(None);
        const diffLhsCtor = Number(None) - 42;

        const prodRhsCtor = 42 * Number(None);
        const prodLhsCtor = Number(None) * 42;

        const quotRhsCtor = 42 / Number(None);
        const quotLhsCtor = Number(None) / 42;

        assertStrictEquals(sumRhsPlus, 42);
        assertStrictEquals(sumLhsPlus, 42);
        assertStrictEquals(sumRhsCtor, 42);
        assertStrictEquals(sumLhsCtor, 42);
        assertStrictEquals(diffRhsPlus, 42);
        assertStrictEquals(diffLhsPlus, -42);
        assertStrictEquals(diffRhsCtor, 42);
        assertStrictEquals(diffLhsCtor, -42);
        assertStrictEquals(prodRhsPlus, 0);
        assertStrictEquals(prodLhsPlus, 0);
        assertStrictEquals(prodRhsCtor, 0);
        assertStrictEquals(prodLhsCtor, 0);
        assertStrictEquals(quotRhsPlus, Infinity);
        assertStrictEquals(quotLhsPlus, 0);
        assertStrictEquals(quotRhsCtor, Infinity);
        assertStrictEquals(quotLhsCtor, 0);
      },
    );
  });
});
