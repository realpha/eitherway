import {
  assertInstanceOf,
  assertStrictEquals,
  assertThrows,
  assertType,
  IsExact,
} from "../../dev_deps.ts";
import { isEitherwayPanic, Panic, panic } from "./errors.ts";

Deno.test("eitherway::core::errors", async (t) => {
  await t.step("Panic<E> -> Contructors", async (t) => {
    await t.step("new() -> creates a generic instance", () => {
      const cause = new Error("boom");
      const pnc = new Panic(cause, "Runtime exception");

      assertType<IsExact<typeof pnc, Panic<Error>>>(true);
      assertInstanceOf(pnc, Error);
      assertInstanceOf(pnc, Panic);
      assertStrictEquals(pnc.constructor, Panic);
      assertStrictEquals(pnc.name, "eitherway::Panic");
      assertStrictEquals(pnc.message, "Runtime exception");
      assertStrictEquals(pnc.cause, cause);
    });
    await t.step(".causedBy() -> creates a generic instance", () => {
      const cause = Error("boom");
      const pnc = Panic.causedBy(cause, "Runtime exception");

      assertType<IsExact<typeof pnc, Panic<Error>>>(true);
      assertInstanceOf(pnc, Error);
      assertInstanceOf(pnc, Panic);
      assertStrictEquals(pnc.constructor, Panic);
      assertStrictEquals(pnc.name, "eitherway::Panic");
      assertStrictEquals(pnc.message, "Runtime exception");
      assertStrictEquals(pnc.cause, cause);
    });
  });

  await t.step(
    "isEitherwayPanic() -> narrows an unknown value to a Panic",
    () => {
      const err = Error("boom");
      const pnc = Panic.causedBy(null, "Expected non-nullish value");

      assertStrictEquals(isEitherwayPanic(pnc), true);
      assertStrictEquals(isEitherwayPanic(err), false);
      assertStrictEquals(isEitherwayPanic(null), false);
      assertStrictEquals(isEitherwayPanic(true), false);
    },
  );

  await t.step("panic() -> throws the provided error", () => {
    const err = TypeError("boom");

    assertThrows(() => panic(err), TypeError, "boom");
  });

  await t.step(
    "panic() -> throws a Panic<E> if err is not a subtype of native Error",
    () => {
      const rec = {
        name: "ErrorLike",
        message: "boom",
        cause: null,
        stack: "ErrorLike: boom\n",
      };

      assertThrows(() => panic(rec), Panic, "unknown error");
    },
  );

  await t.step("panic() -> throws a Panic<void> if err is nullish", () => {
    assertThrows(() => panic(), Panic, "unknown error");
  });
});
