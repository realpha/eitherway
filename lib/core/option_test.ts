import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertObjectMatch,
  assertStrictEquals,
} from "../../dev_deps.ts";
import { None, Option, Some } from "./option.ts";

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

const err = new Error("test::error");

const falsyNotNullish = [false, NaN, emptyStr, zero, bnZero];
const nullish = [null, undefined];

const allTruthy = [str, num, bnum, inf, b, arr, rec, sym, date];
// @ts-ignore-lines TS cannot match these heterogenous arrays
const allInfallible = allTruthy.concat(falsyNotNullish);
// @ts-ignore-lines TS cannot match these heterogenous arrays
const allNonNullish = allInfallible.concat([err]);
// @ts-ignore-lines TS cannot match these heterogenous arrays
const allFalsy = falsyNotNullish.concat(nullish);
// @ts-ignore-lines TS cannot match these heterogenous arrays
const allFallible = nullish.concat([err]);
// @ts-ignore-lines TS cannot match these heterogenous arrays
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
    "instanceof Option -> returns true for instances of Some & None",
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
      "[Symbol.iterator]() -> supports object spread and conforms iterator protocol",
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

        assertObjectMatch(copy, {
          a: 1,
          num: Some(2),
          arr: Some([1, 2, 3]),
          rec: Some({ a: 1 }),
        });
        assertObjectMatch(copyInner, {});
        assertObjectMatch(copyInnerUnwrapped, { a: 1 });
        assertArrayIncludes(arrCopy, [1, 2, 3]);
        assertObjectMatch(iterResNum, { done: true, value: 2 });
        assertObjectMatch(iterResRec, { done: true, value: { a: 1 } });
      },
    );
    // await t.step(
    //   "[Symbol.toPrimitve]() -> supports all hints and returns falsy defaults",
    //   () => {
    //     const str = Some[Symbol.toPrimitive]("string");
    //     const num = Some[Symbol.toPrimitive]("number");
    //     const def = Some[Symbol.toPrimitive]("default");
    //
    //     assertStrictEquals(str, "");
    //     assertStrictEquals(num, 0);
    //     assertStrictEquals(def, false);
    //   },
    // );
    // await t.step(
    //   "toJSON() -> returns undefined, thus being stripped by JSON.stringify()",
    //   () => {
    //     const def = Some.toJSON();
    //     const str = JSON.stringify(Some);
    //     const rec = { a: "a", b: Some };
    //     const recStr = JSON.stringify(rec);
    //
    //     assertStrictEquals(def, undefined);
    //     assertStrictEquals(str, undefined);
    //     assertStrictEquals(recStr, '{"a":"a"}');
    //   },
    // );
    // await t.step("toString() -> return empty string", () => {
    //   const str = Some.toString();
    //
    //   assertStrictEquals(str, "");
    // });
    // await t.step("valueOf() -> returns 0", () => {
    //   const num = Some.valueOf();
    //
    //   assertStrictEquals(num, 0);
    // });
  });

  // await t.step("Some -> Coercions", async (t) => {
  //   await t.step(
  //     'Primitive coercion -> returns false (ops: binary "+" [string concatenation & addition], loose equality, Date constructor)',
  //     () => {
  //       // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion
  //       const primitiveStr = "This is " + Some;
  //       //@ts-ignore-lines for testing purposes
  //       const primitiveSum = Some + 42;
  //       //@ts-ignore-lines for testing purposes
  //       const primitiveCmp = 0 == Some;
  //       //@ts-ignore-lines for testing purposes
  //       const primitiveDate = new Date(Some);
  //
  //       const expectedStr = "This is false"; // false is further coerced to string
  //       const expectedSum = 42; // false is further coerced to 0
  //       const expectedCmp = true; // false is further coerced to 0 (LOLse equality... what a joke)
  //       const expectedDate = new Date(0); //Again, false is further coerced to 0
  //
  //       assertStrictEquals(primitiveStr, expectedStr);
  //       assertStrictEquals(primitiveSum, expectedSum);
  //       assertStrictEquals(primitiveCmp, expectedCmp);
  //       assertStrictEquals(primitiveDate.toString(), expectedDate.toString());
  //     },
  //   );
  //   await t.step(
  //     "String coercion -> returns empty string (ops: template literal, String constructor)",
  //     () => {
  //       const tmpl = `This is ${Some}`;
  //       const ctor = "This is " + String(Some);
  //
  //       const expected = "This is ";
  //
  //       assertStrictEquals(
  //         tmpl,
  //         expected,
  //       );
  //       assertStrictEquals(ctor, expected);
  //     },
  //   );
  //   await t.step(
  //     'Number coercion -> returns 0 (ops: unary "+" and Number constructor)',
  //     () => {
  //       const sumRhsPlus = 42 + +Some;
  //       const sumLhsPlus = +Some + 42;
  //
  //       const diffRhsPlus = 42 - +Some;
  //       const diffLhsPlus = +Some - 42;
  //
  //       const prodRhsPlus = 42 * +Some;
  //       const prodLhsPlus = +Some * 42;
  //
  //       const quotRhsPlus = 42 / +Some;
  //       const quotLhsPlus = +Some / 42;
  //
  //       const sumRhsCtor = 42 + Number(Some);
  //       const sumLhsCtor = Number(Some) + 42;
  //
  //       const diffRhsCtor = 42 - Number(Some);
  //       const diffLhsCtor = Number(Some) - 42;
  //
  //       const prodRhsCtor = 42 * Number(Some);
  //       const prodLhsCtor = Number(Some) * 42;
  //
  //       const quotRhsCtor = 42 / Number(Some);
  //       const quotLhsCtor = Number(Some) / 42;
  //
  //       assertStrictEquals(sumRhsPlus, 42);
  //       assertStrictEquals(sumLhsPlus, 42);
  //       assertStrictEquals(sumRhsCtor, 42);
  //       assertStrictEquals(sumLhsCtor, 42);
  //       assertStrictEquals(diffRhsPlus, 42);
  //       assertStrictEquals(diffLhsPlus, -42);
  //       assertStrictEquals(diffRhsCtor, 42);
  //       assertStrictEquals(diffLhsCtor, -42);
  //       assertStrictEquals(prodRhsPlus, 0);
  //       assertStrictEquals(prodLhsPlus, 0);
  //       assertStrictEquals(prodRhsCtor, 0);
  //       assertStrictEquals(prodLhsCtor, 0);
  //       assertStrictEquals(quotRhsPlus, Infinity);
  //       assertStrictEquals(quotLhsPlus, 0);
  //       assertStrictEquals(quotRhsCtor, Infinity);
  //       assertStrictEquals(quotLhsCtor, 0);
  //     },
  //   );
  // });
});

Deno.test("eitherway::Option::None", async (t) => {
  await t.step("None -> JS well-known symbols and methods", async (t) => {
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
      "[Symbol.iterator]() -> supports object spread and conforms iterator protocol",
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
