import {
  assertInstanceOf,
  assertStrictEquals,
  assertThrows,
} from "../../dev_deps.ts";
import { assert, AssertionError } from "./assert.ts";

Deno.test("eitherway::core::assert", async (t) => {
  await t.step("AssertionError -> Is a subclass of TypeError", () => {
    const err = new AssertionError("test");

    assertInstanceOf(err, Error);
    assertInstanceOf(err, TypeError);
    assertInstanceOf(err, AssertionError);
    assertStrictEquals(err.constructor, AssertionError);
    assertStrictEquals(err.name, "AssertionError");
    assertStrictEquals(err.message, "test");
  });

  await t.step("AssertionError -> can be constructed with a cause", () => {
    const err = new AssertionError("test", { cause: new Error("boom") });

    assertInstanceOf(err.cause, Error);
    assertStrictEquals(err.cause.message, "boom");
  });

  await t.step("assert() -> panics if expression evaluates to false", () => {
    assertThrows(() => {
      assert(false);
    });
  });
});
