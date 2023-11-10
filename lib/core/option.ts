//deno-lint-ignore-file no-unused-vars
/**
 * NOTE: the "no-unused-vars" lint rule is ignored in order to ensure
 * method parameter names are symetrical
 */
import { assert } from "./assert.ts";
import type {
  Empty,
  Infallible,
  JsonRepr,
  NonNullish,
  StringRepr,
  Truthy,
  ValueRepr,
} from "./type_utils.ts";
import {
  EMPTY,
  hasToJSON,
  isInfallible,
  isNotNullish,
  isPrimitive,
  isTruthy,
} from "./type_utils.ts";
import { Err, Ok, Result } from "./result.ts";

/**
 * ==============
 * BASE INTERFACE
 * ==============
 */

export interface IOption<T> {
  /**
   * Type predicate - use this to narrow an `Option<T>` to `Some<T>`
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const maybeStr = Option.from("something" as string | undefined);
   *
   * function assertSome<T>(o: Option<T>): asserts o is Some<T> {
   *   if(o.isSome()) return;
   *   throw TypeError("Expected Some. Received: None!");
   * }
   *
   * assertSome(maybeStr);
   * const str: string = maybeStr.unwrap();
   *
   * assert(str === "something");
   * ```
   */
  isSome(): this is Some<T>;

  /**
   * Type predicate - use this to narrow an `Option<T>` to `None`
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const maybeStr = Option.from("something" as string | undefined);
   *
   * function expect<T>(o: Option<T>): T {
   *   if(o.isNone()) {
   *     throw TypeError("Expected Some. Received: None!");
   *   }
   *   return o.unwrap() // here `Option<T>` is narrowed to `Some<T>`
   * }
   *
   * const str: string = expect(maybeStr);
   *
   * assert(str === "something");
   * ```
   */
  isNone(): this is None;

  /**
   * Use this to return the Option itself
   *
   * Canonical identity function
   *
   * Mainly useful for flattening types of `Option<Option<T>>` togehter
   * with `andThen()`,
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const nested = Some(Option.from("something"));
   * const nestedNone = Some(None);
   *
   * const flattened = nested.andThen(o => o.id());
   * const none = nestedNone.andThen(o => o.id());
   *
   * assert(flattened.isSome() === true);
   * assert(flattened.unwrap() === "something");
   * assert(none.isNone() === true);
   * assert(none.unwrap() === undefined);
   * ```
   */
  id(): Option<T>;

  /**
   * Use this to obtain a deep clone of `Option<T>`
   *
   * Under the hood, this uses the `structuredClone` algorithm exposed via
   * the global function of the same name
   *
   * May incur performance penalties, depending on the platform, size and type
   * of the data to be cloned
   *
   * Can be handy if user-defined operations on reference types mutate the
   * passed value and the original value should be retained
   *
   * CAUTION: Mutations in a chained series of operations are strongly
   * discouraged
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * //This really is an anti-example - don't do that
   *
   * const rec = { a: "some", b: "thing" };
   * const maybeRec = Option.from(rec);
   * const encode = JSON.stringify;
   * function mutate(rec: Record<string, string>): Record<string, string> {
   *   if ("a" in rec) {
   *     delete rec.a;
   *   }
   *
   *   return rec;
   * }
   *
   * const maybeRecMutated = maybeRec.clone().map(mutate);
   *
   * const recUnwrapped = maybeRec.unwrap();
   * const mutatedUnwrapped = maybeRecMutated.unwrap();
   *
   * assert(recUnwrapped === rec); // Same reference
   * assert(mutatedUnwrapped !== rec);
   * assert(encode(recUnwrapped) !== encode(mutatedUnwrapped));
   * ```
   */
  clone(): Option<T>;

  /**
   * Use this to transform `Some<T>` to `Some<U>` by applying the supplied
   * `mapFn` to the  wrapped value of type `<T>`
   *
   * Produces a new instance of `Some`
   *
   * In case of `None`, this method short-circuits and returns `None`
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const toUpperCase = (s: string) => s.toUpperCase();
   * const some = Some("something");
   * const none = None;
   *
   * const someUppercased = some.map(toUpperCase);
   * const stillNone = none.map(toUpperCase);
   *
   * assert(someUppercased.isSome() === true);
   * assert(stillNone.isNone() === true);
   * assert(someUppercased.unwrap() === "SOMETHING");
   * ```
   */
  map<U>(mapFn: (arg: Readonly<T>) => NonNullish<U>): Option<NonNullish<U>>;

  /**
   * Same as `.map()`, but in case of `None`, a new instance of `Some` wrapping
   * the provided `orValue` of type `<U>` will be returned
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const toUpperCase = (s: string) => s.toUpperCase();
   * const orValue = "SOMETHING";
   * const some = Some("something");
   * const none = None;
   *
   * const someUppercased = some.mapOr(toUpperCase, orValue);
   * const someOrValue = none.mapOr(toUpperCase, orValue);
   *
   * assert(someUppercased.isSome() === true);
   * assert(someOrValue.isSome() === true);
   * assert(someUppercased.unwrap() === "SOMETHING");
   * assert(someOrValue.unwrap() === "SOMETHING");
   * ```
   */
  mapOr<U>(
    mapFn: (arg: Readonly<T>) => NonNullish<U>,
    orValue: NonNullish<U>,
  ): Some<NonNullish<U>>;

  /**
   * Same as `.map()`, but in case of `None`, a new instance of `Some` wrapping
   * the return value of the provided `elseFn` will be returned
   *
   * Use this if the fallback value is expensive to produce
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const toUpperCase = (s: string) => s.toUpperCase();
   * const elseFn = () => "SOMETHING";
   * const some = Some("something");
   * const none = None;
   *
   * const someUppercased = some.mapOrElse(toUpperCase, elseFn);
   * const someDefault = none.mapOrElse(toUpperCase, elseFn);
   *
   * assert(someUppercased.isSome() === true);
   * assert(someDefault.isSome() === true);
   * assert(someUppercased.unwrap() === "SOMETHING");
   * assert(someDefault.unwrap() === "SOMETHING");
   * ```
   */
  mapOrElse<U>(
    mapFn: (arg: Readonly<T>) => NonNullish<U>,
    elseFn: () => NonNullish<U>,
  ): Some<NonNullish<U>>;

  /**
   * Use this to refine a wrapped value `<T>` to `<U>` or cheaply convert
   * an instance of `Some<T>` to `None` in case the wrapped fails the supplied
   * predicate function
   *
   * In case of `None`, this method short-circuits and returns `None`
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const numOrStr = 0 as string | number;
   * const isNum = (value: unknown): value is number => typeof value === "number";
   *
   * const none = Option.fromCoercible(numOrStr); //Option<number | string>
   * const same = none.filter(isNum);             //Option<number>
   *
   * assert(same === none);
   * ```
   */
  filter<U extends T>(predicate: (arg: Readonly<T>) => arg is U): Option<U>;
  filter(predicate: (arg: Readonly<T>) => boolean): Option<T>;

  /**
   * Use this to produce a new `Option` instance from the wrapped value or
   * flatten a nested `Option`
   *
   * Given `Some<T>`, applies the supplied `thenFn` to the wrapped value of
   * type `<T>`, which produces a new `Option<U>`
   *
   * In case of `None`, this method short-circuits and returns `None`
   *
   * This is equivalent to the canonical `flatMap()` method in traditional
   * functional idioms, thus it can be used to flatten instances of
   * `Option<Option<T>>` to `Option<T>`
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * function randomize(n: number): Option<number> {
   *   return Option.from(Math.random() * n);
   * }
   *
   * function greaterThanTen(n: number): Option<number> {
   *   return n > 10  ? Some(n) : None;
   * }
   *
   * const none = Option.fromCoercible(0);
   * const small = Option(10);
   * const big = Option(100);
   * const nested = Option(big);
   *
   * const alwaysNone = none
   *   .andThen(randomize)            // -> None; short-circuit'd
   *   .andThen(greaterThanTen);      // -> same as above
   *
   * const less = small
   *   .andThen(randomize)            // -> Some<number>
   *   .andThen(greaterThanTen);      // -> None
   *
   * const greater = big
   *   .andThen(randomize)            // -> Some<number>
   *   .andThen(greaterThanTen);      // -> Some<number>
   *
   * const flattened = nested         // -> Some<Some<number>>
   *   .andThen(Option.id<number>)    // -> Some<number>
   *   .andThen(greaterThanTen);      // -> Some<number>
   *
   * assert(alwaysNone.isNone() === true);
   * assert(less.isNone() === true);
   * assert(greater.isSome() === true);
   * assert(flattened.isSome() === true);
   * ```
   */
  andThen<U>(thenFn: (arg: Readonly<T>) => Option<U>): Option<U>;

  /**
   * Use this if you want to recover from `None` or lazily initialize a
   * fallback `Option<U>` in case of `None`
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * function fallback() {
   *   return Some("EXPENSIVE TO PRODUCE");
   * }
   * function expensiveGeneration(s: string): Option<string> {
   *   if (s.length !== 42) return None;
   *   return Some(s.toUpperCase());
   * }
   * const someStr = Some("thing");
   *
   * const maybeExpensive = someStr
   *   .andThen(expensiveGeneration)
   *   .orElse(fallback);
   *
   * assert(maybeExpensive.isSome() === true);
   * assert(maybeExpensive.unwrap() === "EXPENSIVE TO PRODUCE");
   * ```
   */
  orElse<U>(elseFn: () => Option<U>): Some<T> | Option<U>;

  /**
   * Use this to get the wrapped value out of an `Option` instance
   *
   * Returns the wrapped value of type `<T>` in case of `Some<T>` OR
   * `undefined` in case of `None`
   *
   * It is necessary, to narrow an instance of `Option<T>` to `Some<T>`
   * in order to narrow the return value of `.unwrap()`
   *
   * In contrast to other implementations, this method NEVER throws an
   * exception
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const maybeStr = Option.from("something" as string | undefined);
   * const maybeUndef = Option.from(undefined as string | undefined);
   *
   * // This is in fact a type assertion
   * function expect<T>(o: Option<T>): T {
   *   if(o.isNone()) {
   *     throw TypeError("Expected Some. Received: None!");
   *   }
   *   return o.unwrap() // here `Option<T>` is narrowed to `Some<T>`
   * }
   *
   * function makeLoud(str: string): string {
   *   return str.toUpperCase().concat("!!!");
   * }
   *
   * const str: string = makeLoud(expect(maybeStr));
   * const undef: string | undefined = maybeUndef.unwrap();

   * assert(str === "SOMETHING!!!");
   * assert(undef === undefined);
   * ```
   */
  unwrap(): T | undefined;

  /**
   * Same as `.unwrap()`, but with a fallback value
   *
   * Returns the wrapped value of type `<T>` or returns a fallback value of
   * type `<U>` in case of `None`
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const orValue = "some";
   * const none = None;
   * const some = Some("thing");
   *
   * const res = none.unwrapOr(orValue) + some.unwrapOr(orValue);
   *
   * assert(res === "something");
   * ```
   */
  unwrapOr<U>(orValue: NonNullish<U>): T | NonNullish<U>;

  /**
   * Same as `.unwrap()`, but with a fallback function
   *
   * Returns the value of type `<T>` or lazily produces a value of type `<U>` in
   * case of `None`
   *
   * Use this if the fallback value is expensive to produce
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const elseFn = () => "some";
   * const none = None;
   * const some = Some("thing");
   *
   * const res = none.unwrapOrElse(elseFn) + some.unwrapOrElse(elseFn);
   *
   * assert(res === "something");
   * ```
   */
  unwrapOrElse<U>(elseFn: () => NonNullish<U>): T | NonNullish<U>;

  /**
   * Use this to transform an `Option<T>` into a Result<T, E> by providing
   * a possible Error value in case of `None`
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   * import { Result } from "./result.ts";
   *
   * const typeError = new TypeError("Something went wrong!");
   * const opt = Option.fromCoercible("");
   *
   * const res: Result<string, TypeError> = opt.okOr(typeError);
   *
   * assert(res.isErr() === true);
   * ```
   */
  okOr<E>(err: E): Result<T, E>;

  /**
   * Use this to transform an `Option<T>` into a `Result<T, E>` by providing
   * a function to lazily produce a possible Error value in case of `None`
   *
   * This is mostly useful if the Error value is expensive to produce
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   * import { Result } from "./result.ts";
   *
   * function errFn(): TypeError {
   *   return new TypeError("Something went wrong!");
   * }
   *
   * const opt = Option.fromCoercible("");
   *
   * const res: Result<string, TypeError> = opt.okOrElse(errFn);
   *
   * assert(res.isErr() === true);
   * ```
   */
  okOrElse<E>(err: () => E): Result<T, E>;

  /**
   * Use this to transform an `Option<T>` into a type of your choosing
   *
   * This is mostly useful for shoving an `Option<T>` into an async context.
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const some = Option(42);
   *
   * const maybeInt = some.into(s => Promise.resolve(s.unwrap()));
   *
   * maybeInt.then((x) => assert(x === 42));
   * ```
   */
  into<U>(intoFn: (arg: Option<T>) => U): U;

  /**
   * Use this to produce a tuple from two wrapped values if both are `Some`,
   * otherwise return `None`
   *
   * Apart from creating tuples, this is mostly useful for composing arguments,
   * which should be applied to a function down the line
   *
   * |  LHS  x  RHS  | RHS: Some<U> |  RHS: None  |
   * |---------------|--------------|-------------|
   * |  LHS: Some<T> | Some<[T, U]> |     None    |
   * |  LHS:  None   |     None     |     None    |
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * type LogArgs = [boolean, string];
   * function produceLogEntry(args: LogArgs): Option<Record<string, string>> {
   *   return Option({
   *       lvl: args[0] ? "debug" : "info",
   *       msg: args[1],
   *   });
   * }
   *
   * const debug = Some(true);
   * const logMsg = Some("I am here!");
   * const none = Option.fromCoercible("");
   *
   * const maybeLogEntry = debug.zip(logMsg).andThen(produceLogEntry);
   * const stillNone = debug.zip(none).andThen(produceLogEntry);
   *
   * assert(maybeLogEntry.isSome() === true);
   * assert(stillNone.isNone() === true);
   * ```
   */
  zip<U>(rhs: Option<U>): Option<[T, U]>;

  /**
   * Use this to perform synchronous side-effects which can derail the
   * current `Option<T>`
   *
   * This is equivalent to chaining:
   * `original.andThen(tripFn).and(original)`
   *
   * CAUTION: Seldom useful in a synchronous context
   *
   * |  LHS trip RHS  | RHS: Some<U> |  RHS: None  |
   * |----------------|--------------|-------------|
   * |  LHS: Some<T>  |    Some<T>   |     None    |
   * |  LHS:  None    |      None    |     None    |
   *
   * In case of `None` this method short-circuits and returns `None`
   *
   * In case of `Some<T>`, the provided `tripFn` gets called with a value
   * of type `<T>` and if the return value is:
   *  - `Some<U>` - it is discarded and the original `Some<T>` is returned
   *  - `None`: `None` is returned
   *
   * @category Option::Advanced
   *
   * @example
   * ```
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   * import { existsSync } from "https://deno.land/std@0.199.0/fs/mod.ts";
   *
   * interface Config {
   *   rootDir: string;
   *   cmd: string;
   * }
   *
   * function isReadableDir(path: string): Option<true> {
   *   return Option.fromCoercible(
   *     existsSync(path, {
   *       isReadable: true,
   *       isDirectory: true,
   *     });
   *   );
   * }
   *
   * function finalizeConfig(path: string): Option<Config> {
   *   return Some({
   *     rootDir: path,
   *     cmd: "git add -A"
   *   });
   * }
   *
   * const path = Some("~/.dotfiles/README.md)
   *
   * const maybeConfig = path
   *   .trip(isReadableDir)
   *   .andThen(finalizeConfig);
   *
   * assert(maybeConfig.isNone() === true);
   * ```
   */
  trip<U>(tripFn: (value: T) => Option<U>): Option<T>;

  /**
   * Logical AND ( && )
   * Returns RHS if LHS is `Some<T>`
   *
   * |  LHS  &&  RHS  | RHS: Some<U> |  RHS: None  |
   * |----------------|--------------|-------------|
   * |  LHS: Some<T>  |    Some<U>   |     None    |
   * |  LHS:  None    |      None    |     None    |
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * // Given a config interface...
   * type ConfigJSON = {
   *   enableDebugLogs?: boolean;
   *   enableTelemetry?: boolean;
   *   enableCrashReports?: boolean;
   * }
   * type Config = {
   *   enableDebugLogs: Option<true>;
   *   enableTelemetry: Option<true>;
   *   enableCrashReports: Option<true>;
   * }
   * function parseConfig(json: ConfigJSON): Config {
   *   return {
   *     enableDebugLogs: Option.fromCoercible(json.enableDebugLogs),
   *     enableTelemetry: Option.fromCoercible(json.enableTelemetry),
   *     enableCrashReports: Option.fromCoercible(json.enableCrashReports),
   *   };
   * }
   *
   * // which may require an expensive setup...
   * async function expensiveSetup(): Promise<void> {
   *   // ...this might take a while...
   *   return;
   * }
   * async function selectiveSetup(c: Config): Promise<void> {
   *   // ...match the options here etc
   *   return;
   * }
   *
   * // ...its possible to decide whether or not the expnsive is necessary
   * async function main(): Promise<void> {
   *   const configJSON = await import("path/to/config.json", {
   *     assert: { type: "json" },
   *   });
   *   const config = parseConfig(configJSON as ConfigJSON);
   *
   *   const {
   *     enableDebugLogs,
   *     enableTelemetry,
   *     enableCrashReports,
   *   } = config;
   *
   *   if (
   *     enableDebugLogs
   *      .and(enableTelemetry)
   *      .and(enableCrashReports)
   *      .isSome()
   *   ) {
   *     await expensiveSetup();
   *   } else {
   *     await selectiveSetup(config);
   *   }
   *
   *   return;
   * }
   * ```
   */
  and<U>(rhs: Option<U>): Some<T> | Some<U> | None;

  /**
   * Logical OR ( || )
   * Returns LHS if LHS is `Some<T>`, otherwise returns RHS
   *
   * |  LHS  ||  RHS  | RHS: Some<U> |  RHS: None  |
   * |----------------|--------------|-------------|
   * |  LHS: Some<T>  |    Some<T>   |   Some<T>   |
   * |  LHS:  None    |    Some<U>   |    None     |
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const maybe = Option.from(undefined);
   * const fallback = Option.from("default");
   *
   * const res = maybe.or(fallback).unwrap();
   *
   * assert(res === "default");
   * ```
   */
  or<U>(rhs: Option<U>): Some<T> | Some<U> | None;

  /**
   * Logical XOR ( ^ )
   * Useful when only one of two values should be `Some`, but not both
   * Returns `Some`, if only LHS or RHS is `Some`
   *
   * |  LHS  ^  RHS   | RHS: Some<U> |  RHS: None  |
   * |----------------|--------------|-------------|
   * |  LHS: Some<T>  |     None     |    Some<T>  |
   * |  LHS:  None    |    Some<U>   |     None    |
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * // A small config utility
   * // Contrived, but should do the trick
   *
   * type Path = string
   *
   * // Only one of those SHOULD be `Some`
   * type Extra = {
   *   workDir: Option<Path>;
   *   homeDir: Option<Path>;
   * }
   * type Config = {
   *   alias: string;
   *   defaultCmd: string;
   *   targetDir?: Path;
   * }
   * const createConfig = function(c: Config, ext: Extra): Config {
   *   const { workDir, homeDir } = ext;
   *
   *   if (workDir.xor(homeDir).isNone()) return c;
   *
   *   // here it doesn't matter which of those is `Some`
   *   return { ...c, targetDir: workDir.or(homeDir).unwrap() };
   * }
   *
   * // Setup the parts
   * const extra = {
   *   workDir: Some("~/workbench"),
   *   homeDir: None,
   * }
   * const baseConfig = {
   *   alias: "gcm",
   *   defaultCmd: "git commit -m",
   * }
   * const config = createConfig(baseConfig, extra);
   *
   * assert(config.targetDir === "~/workbench");
   * ```
   */
  xor<U>(rhs: Option<U>): Some<T> | Some<U> | None;

  /**
   * Use this to perform side-effects transparently
   *
   * The `tapFn` receives a deep clone of `Option<T>` {@linkcode IOption#clone}
   *
   * This may have performance implications, dependending on the size of
   * the wrapped value `<T>`, but ensures that the `tapFn` can never
   * change or invalidate the state of the `Option<T>` instance
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * type UserRecord = {
   *   id: string;
   *   name: string;
   *   email: string;
   * }
   *
   * const getUserRecord = function(id: string): UserRecord | undefined {
   *   if (id !== "1") return undefined;
   *   return { id: "1", name: "Allen", email: "allen@example.com" };
   * }
   *
   * const logMut = function (opt: Option<UserRecord>) {
   *   if (opt.isSome()) {
   *     const rec = opt.unwrap();
   *     rec.name = "***";
   *     rec.email = "***";
   *     console.log(JSON.stringify(rec));
   *   }
   *   console.log("No UserRecord found!");
   * };
   *
   * const maybeUserRec = Option.from(getUserRecord("1"));
   * const maybeEmail = maybeUserRec
   *                     .tap(logMut)
   *                     .map((rec) => rec.email);
   *
   * assert(maybeEmail.unwrap() === "allen@example.com");
   * ```
   */
  tap(tapFn: (arg: Option<T>) => void): Option<T>;

  /**
   * Use this to inspect the value inside an instace of `Some<T>`
   * in a transparent manner
   *
   * Short-curcuits in case of `None'
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * function toEven(n: number): Option<number> {
   *   if (n % 2 === 0) return Some(n);
   *   return None;
   * }
   *
   * const maybeEven = Option.from("thing")
   *                    .map(str => str.length)
   *                    .inspect(console.log)
   *                    .andThen(toEven);
   *
   * assert(maybeEven.isNone() === true);
   * ```
   */
  inspect(inspectFn: (value: T) => void): Option<T>;

  /**
   * Use this to get the full string tag
   * Short-hand for `Object.prototype.toString.call(option)`
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const someTag = Some("thing").toTag();
   * const noneTag = None.toTag();
   *
   * assert(someTag === "[object eitherway::Option::Some<thing>]");
   * assert(noneTag === "[object eitherway::Option::None]");
   * ```
   */
  toTag(): string;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * a deep copy of the value itself, if no implementation is present
   *
   * Returns `undefined` in case of `None`
   *
   * See the [`reference`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description)
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const someNum = Some(1);
   * const none = None;
   * const rec = { a: someNum, b: none };
   * const arr = [someNum, none];
   *
   * const encode = JSON.stringify;
   *
   * assert(encode(someNum) === "1");
   * assert(encode(none) === undefined);
   * assert(encode(rec) === encode({ a: 1 }));
   * assert(encode(arr) === encode([1, null]));
   * ```
   */
  toJSON(): JsonRepr<T>;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * the empty string (i.e. `""`) in case of `None`
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const arr = [1];
   * const someArr = Some(arr);
   * const someStr = Some("abc");
   * const empty = None;
   *
   * assert(arr.toString() === "1");
   * assert(someArr.toString() === "1");
   * assert(someStr.toString() === "abc");
   * assert(empty.toString() === "");
   * assert(String(arr) === String(someArr));
   * ```
   */
  toString(): StringRepr<T>;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * 0 in case of `None`
   *
   * Be aware that there exists an asymmetry between `Some<T>` and `None`
   * for all types except `<number>` if `<T>` doesn't implement `.valueOf()`
   * for number coercion.
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf)
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const num = Some(1);
   * const numStr = Some("1");
   * const str = Some("abc");
   * const zero = None;
   *
   * assert(num.valueOf() === 1);
   * assert(zero.valueOf() === 0);
   * assert(numStr.valueOf() === "1");
   * assert(Number(numStr) === 1);
   * assert(Number.isNaN(Number("abc")));
   * assert(Number.isNaN(Number(str)));
   * ```
   */
  valueOf(): ValueRepr<T>;

  /**
   * Use this to obtain an iterator over the wrapped value `<T>`
   *
   * In case of `None`, an empty iterator is returned
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const opt = Option.from(42);
   *
   * let count = 0;
   * let yieldedValue = undefined;
   *
   * for (const value of opt.iter()) {
   *   count += 1;
   *   yieldedValue = value;
   * }
   *
   * const fresh = opt.iter();
   * const first = fresh.next();
   * const exhausted = fresh.next();
   *
   * assert(count === 1);
   * assert(yieldedValue === 42);
   * assert(first.done === false);
   * assert(first.value === 42);
   * assert(exhausted.done === true);
   * assert(exhausted.value === undefined);
   * ```
   */
  iter(): IterableIterator<T>;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or exhausts
   * the iterator by returning `{ done: true, value: undefined }` if `<T>` doesn't
   * implement the iterator protocol
   *
   * `None` represents the empty iterator and returns the empty iterator result
   * `{ done: true, value: undefined }`
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator)
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const arr = [1, 2, 3];
   * const someArr = Some(arr);
   * const none = Option.from(undefined);
   *
   * const loop = () => {
   *   let count = 0;
   *   for (const _item of none) {
   *     count += 1;
   *   }
   *   return count;
   * };
   * const arrCopy = [ ...someArr ];
   * const noneArrCopy = [ ...none ];
   * const iterCount = loop();
   * const iterRes = none[Symbol.iterator]().next();
   *
   * const encode = JSON.stringify;
   *
   * assert(iterCount === 0);
   * assert(iterRes.done === true);
   * assert(iterRes.value === undefined);
   * assert(encode(arrCopy) === encode(arr));
   * assert(encode(noneArrCopy) === encode([]));
   * ```
   */
  [Symbol.iterator](): IterableIterator<
    T extends Iterable<infer U> ? U : never
  >;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * `<T>` if it already is a primitive value
   *
   * This method *ALWAYS* returns a primitive value, as required by the spec
   * In case of keyed/indexed collection types, if no primitive conversion
   * is defined, their `string` representation will be returned (i.e.
   * `collection.toString()`)
   *
   * In case of `None` the spec required hints produce the following values:
   *  - "string" -> ""
   *  - "number" -> 0
   *  - "default"? -> false
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion)
   *
   * @category Option::Advanced
   */
  [Symbol.toPrimitive](hint?: string): string | number | boolean | symbol;

  /**
   * This well-known symbol is called by `Object.prototype.toString` to
   * obtain a string representation of a value's type
   *
   * This maybe useful for debugging or certain logs
   *
   * The [`.toTag()`]{@link this#toTag} method is a useful short-hand in these scenarios
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag)
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const rec = Some({ a: 1, b: 2 });
   * const str = Some("abc");
   * const none = None;
   *
   * const toString = Object.prototype.toString;
   *
   * assert(toString.call(rec) === "[object eitherway::Option::Some<[object Object]>]");
   * assert(toString.call(str) === "[object eitherway::Option::Some<abc>]");
   * assert(toString.call(none) === "[object eitherway::Option::None]");
   * assert(toString.call(Option) === "[object eitherway::Option]");
   * assert(toString.call(Some) === "[object eitherway::Option::Some]");
   * assert(toString.call(None) === "[object eitherway::Option::None]");
   * ```
   */
  [Symbol.toStringTag]: string;
}

/**
 * ==============
 * IMPLEMENTATION
 * ==============
 */

// By declaring an unused, generic type parameter, we get a nicer alias.
class _None<T = never> implements IOption<never> {
  isSome(): this is Some<never> {
    return false;
  }
  isNone(): this is None {
    return true;
  }
  id(): None {
    return this;
  }
  clone(): None {
    return this;
  }
  map<U>(mapFn: (arg: never) => NonNullish<U>): None {
    return this;
  }
  mapOr<U>(
    mapFn: (arg: never) => NonNullish<U>,
    orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return Some(orValue);
  }
  mapOrElse<U>(
    mapFn: (arg: never) => NonNullish<U>,
    elseFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
    return Some(elseFn());
  }
  filter(predicate: (arg: never) => boolean): None {
    return this;
  }
  zip<U>(rhs: Option<U>): None {
    return this;
  }
  andThen<U>(thenFn: (arg: never) => Option<U>): None {
    return this;
  }
  orElse<U>(elseFn: () => Option<U>): Option<U> {
    return elseFn();
  }
  unwrap() {
    return undefined;
  }
  unwrapOr<U>(orValue: NonNullish<U>) {
    return orValue;
  }
  unwrapOrElse<U>(elseFn: () => NonNullish<U>) {
    return elseFn();
  }
  okOr<E>(err: E): Err<E> {
    return Err(err);
  }
  okOrElse<E>(errFn: () => E): Err<E> {
    return Err(errFn());
  }
  into<U>(intoFn: (arg: Option<never>) => U): U {
    return intoFn(this);
  }
  and<U>(rhs: Option<U>): None {
    return this;
  }
  or<U>(rhs: Option<U>): Option<U> {
    return rhs;
  }
  xor<U>(rhs: Option<U>): Some<U> | None {
    if (rhs.isSome()) return rhs;
    return this;
  }
  tap(tapFn: (arg: None) => void) {
    tapFn(None);
    return this;
  }
  inspect(inspectFn: (value: never) => void): None {
    return this;
  }
  trip<U>(tripFn: (value: never) => Option<U>): None {
    return this;
  }
  toTag(): string {
    return Object.prototype.toString.call(this);
  }
  toJSON(): JsonRepr<never> {
    return undefined;
  }
  toString(): StringRepr<never> {
    return "";
  }
  valueOf(): ValueRepr<never> {
    return 0;
  }
  //deno-lint-ignore require-yield
  *iter(): IterableIterator<never> {
    return;
  }
  //deno-lint-ignore require-yield
  *[Symbol.iterator](): IterableIterator<never> {
    /**
     * This is actually what we want, since returning from a generator implies
     * that it's exhausted, i.e. { done: true, value: undefined }
     */
    return;
  }
  [Symbol.toPrimitive](hint?: string): "" | 0 | false {
    if (hint === "string") return "";
    if (hint === "number") return 0;
    return false;
  }
  get [Symbol.toStringTag]() {
    return "eitherway::Option::None";
  }
}

class _Some<T> implements IOption<T> {
  #value: T;
  constructor(value: T) {
    this.#value = value;
  }

  isSome(): this is Some<T> {
    return true;
  }
  isNone(): this is None {
    return false;
  }
  id(): Some<T> {
    return this;
  }
  clone(): Some<T> {
    return Some(structuredClone(this.#value));
  }
  map<U>(mapFn: (arg: T) => NonNullish<U>): Some<NonNullish<U>> {
    return Some(mapFn(this.#value));
  }
  mapOr<U>(
    mapFn: (arg: T) => NonNullish<U>,
    orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  mapOrElse<U>(
    mapFn: (arg: T) => NonNullish<U>,
    elseFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  filter<U extends T>(predicate: (arg: T) => arg is U): Option<U>;
  filter<U extends T>(predicate: (arg: T) => boolean): Option<U>;
  //deno-lint-ignore no-explicit-any
  filter<U extends T>(predicate: any) {
    /**
     * This is as brittle as it gets and a terrible hack...
     * TODO: test if it's possible to violate type constraints by providing a
     * generic a type argument to a simple predicate, which isn't a type guard
     * TODO: clarify if it would be better to have two distinct methods
     * like `refine` and `filter`
     */
    if (predicate(this.#value)) return this as unknown as Some<U>;
    return None;
  }
  zip<U>(rhs: Option<U>): Option<[T, U]> {
    if (rhs.isNone()) return None;
    return Some([this.#value, rhs.unwrap()] as [T, U]);
  }
  andThen<U>(thenFn: (arg: T) => Option<U>): Option<U> {
    return thenFn(this.#value);
  }
  orElse<U>(elseFn: () => Option<U>): Some<T> {
    return this;
  }
  unwrap(): T {
    return this.#value;
  }
  unwrapOr<U>(orValue: NonNullish<U>): T {
    return this.#value;
  }
  unwrapOrElse<U>(elseFn: () => NonNullish<U>): T {
    return this.#value;
  }
  okOr<E>(err: E): Ok<T> {
    return Ok(this.#value);
  }
  okOrElse<E>(errFn: () => E): Ok<T> {
    return Ok(this.#value);
  }
  into<U>(intoFn: (arg: Option<T>) => U): U {
    return intoFn(this);
  }
  and<U>(rhs: Option<U>): Some<U> | None {
    return rhs;
  }
  or<U>(rhs: Option<U>): Some<T> {
    return this;
  }
  xor<U>(rhs: Option<U>): Some<T> | None {
    if (rhs.isSome()) return None;
    return this;
  }
  tap(tapFn: (arg: Option<T>) => void): Option<T> {
    tapFn(this.clone());
    return this;
  }
  inspect(inspectFn: (value: T) => void): Some<T> {
    inspectFn(this.#value);
    return this;
  }
  trip<U>(tripFn: (value: T) => Option<U>): Option<T> {
    const lhs = tripFn(this.#value);
    return lhs.and(this);
  }
  toTag(): string {
    return Object.prototype.toString.call(this);
  }
  toJSON(): JsonRepr<T> {
    if (hasToJSON(this.#value)) return this.#value.toJSON();
    /**
     * This cast is necessary, because we need to retain the possibility of
     * T being never for the corresponding method on `None`. We know that
     * T != never for Some<T> though
     */
    return this.#value as JsonRepr<T>;
  }
  toString(): StringRepr<T> {
    /**
     * At run time this object coercion would happen implicitely anyway for primitive types
     */
    return Object(this.#value).toString();
  }
  valueOf(): ValueRepr<T> {
    /**
     * At run time this object coercion would happen implicitely anyway for primitive types
     */
    return Object(this.#value).valueOf();
  }
  *iter(): IterableIterator<T> {
    yield this.#value;
  }
  *[Symbol.iterator](): IterableIterator<
    T extends Iterable<infer U> ? U : never
  > {
    const target = Object(this.#value);
    if (Symbol.iterator in target) yield* target;
    return;
  }
  [Symbol.toPrimitive](hint?: string): string | number | boolean | symbol {
    if (isPrimitive(this.#value)) return this.#value;

    const target = Object(this.#value);

    if (Symbol.toPrimitive in target) {
      return target[Symbol.toPrimitive](hint);
    }
    return target.toString();
  }
  get [Symbol.toStringTag]() {
    const innerTag = typeof this.#value === "object"
      ? Object.prototype.toString.call(this.#value)
      : String(this.#value);
    return `eitherway::Option::Some<${innerTag}>`;
  }
}

/**
 * ==============
 *   MODULE API
 * ==============
 *
 * By leveraging declaration merging and the fact that types and values
 * live in seperate namespaces, the API feels way more ergonomic
 */

/**
 * # Some<T>
 *
 * `Some<T>` represents the encapsulation of a value of type `<T>`
 * An instance of `Some` can only be constructed from non-nullish values,
 * so the construction explicitely asserts that the value is not nullish
 *
 * Use {@linkcode Option} to produce a value of type `Option<T>` if T can be
 * nullish.
 *
 * Be aware that this is not only a compile time check, but also enforced
 * at runtime.
 *
 * `Some<T>` is a thin wrapper around `<T>`, in addition to the API one would
 * expect, it implements the iterator protocol and delegates to the underlying
 * implementations of `<T>` when:
 *   - used as an IterableIterator (returns `<T>` if not implemented)
 *   - explicitely or implicitely [coerced](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion)
 *   - encoded as JSON via JSON.stringify()
 *
 * Please checkout {@linkcode None} for the opposite case.
 *
 * @implements {IOption<T>} - {@linkcode IOption} Base interface
 * @throws {AssertionError}
 *
 * @example
 * ```typescript
 * import { assert } from "./assert.ts";
 * import { Option, None, Some } from "./option.ts";
 *
 * const str = "thing";
 * const some = Some(str);
 * const rec = { some };
 * const arr = [ ...some ]; //`String.prototype[@@iterator]()` -> UTF-8 codepoints
 *
 * const encode = JSON.stringify;
 *
 * assert(some instanceof Some === true);
 * assert(some.isSome() === true);
 * assert(some.isNone() === false);
 * assert(some.unwrap() === str);
 * assert(String(some) === str);
 * assert(arr.join("") === str);
 * assert(encode(some) === encode({ some: "thing" }));
 * ```
 */
export type Some<T> = _Some<T>;
export function Some<T>(value: NonNullish<T>): Some<NonNullish<T>> {
  assert(
    isNotNullish(value),
    `${Some} -> Cannot construct Some with a nullish value`,
  );
  return new _Some(value);
}
//deno-lint-ignore no-namespace
export namespace Some {
  /**
   * Use this to signal some kind of success irrespective of
   * the wrapped type as alternative to `Some<void>`
   *
   * Seldom useful in a pure `Option<T>` context, mostly provided
   * for compatibility with `Result<T, E>`, where using `Ok<void>`
   * to signal a successful operation would evaluate to `None`, if
   * converted into an `Option<T>`
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   * import { Empty } from "./type_utils.ts";
   *
   * function doStuff(): Option<Empty> {
   *   return Some.empty();
   * }
   *
   * const res = doStuff()
   *   .okOrElse(() => TypeError("Invalid")) // conversion to Result
   *   .ok(); //convert back to Some<Empty>
   *
   * assert(res.isSome() === true);
   * ```
   */
  export function empty(): Some<Empty> {
    return Some(EMPTY);
  }
}
Object.defineProperty(Some, Symbol.hasInstance, {
  value: <T>(lhs: unknown): lhs is Some<T> => {
    return lhs instanceof _Some;
  },
});
Object.defineProperty(Some, Symbol.toStringTag, {
  value: "eitherway::Option::Some",
});

/**
 * # None
 * `None` represents the absence of a value and is the opinionated, composable
 * equivalent of `undefined`.
 *
 * It support [coercion to the falsy representation of primitive types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion)
 * Furthermore, it implements the iterator protocol and returns `undefined`
 * when it gets JSON encoded via JSON.stringify()
 *
 * Please checkout {@linkcode Some} for the opposite case.
 *
 * @implements {IOption<never>} - {@linkcode IOption} Base interface
 *
 * @example
 * ```typescript
 * import { assert } from "./assert.ts";
 * import { Option, None, Some } from "./option.ts";
 *
 * const none = None;
 * const rec = { a: 1, b: none };
 * const arr = [ ...none ];
 *
 * const encode = JSON.stringify;
 *
 * //TS Bug: https://github.com/microsoft/TypeScript/issues/39064
 * assert(none instanceof (None as any) === true);
 * assert(none.isNone() === true);
 * assert(none.isSome() === false);
 * assert(none.unwrap() === undefined);
 * assert(String(none) === "");
 * assert(Number(none) === 0);
 * assert(none[Symbol.toPrimitive]() === false);
 * assert(Boolean(none) === true); //object always evaluate to true
 * assert(encode(rec) === encode({ a: 1 }));
 * assert(arr.length === 0);
 * ```
 */
export type None = _None;
export const None = new _None() as None;
Object.defineProperty(None, Symbol.hasInstance, {
  value: (lhs: unknown): lhs is None => {
    return lhs instanceof _None;
  },
});
Object.defineProperty(None, Symbol.toStringTag, {
  value: "eitherway::Option::None",
});
Object.freeze(None);

/**
 * # Option<T>
 * `Option<T>` represents:
 *  - EITHER the encapsulation of a value of type `<T>` via {@linkcode Some<T>}
 *  - OR the absence of a value via {@linkcode None}
 *
 * It's the composable equivalent of the union `<T | undefined>`
 *
 * Not only is it useful for representing a value OR the absence of it,
 * but also representing a value and communicating a certain fact
 * about it. As in the following example:
 *
 * ```typescript
 * import { Option } from "./option.ts";
 *
 * type Prime = number;
 * declare function toPrime(n: number): Option<Prime>;
 * ```
 *
 * Furthermore, it's important to note that the encapsulated vaule must not
 * be nullish
 * It's impossible to create an instance of `Some<null | undefined>`
 *
 * The namespace provides additional constructors when it's desired that
 * the return type is invariant over fallible (i.e. Error) or falsy types,
 * as well as a couple of collection helpers
 *
 * @property {<T>(value: T) => Option<NonNullish<T>>} from - alias for Option()
 * @property {<T>(value: T) => Option<Infallible<T>>} fromFallible - also returns None for instances of Error
 * @property {<T>(value: T) => Option<Truthy<T>>} fromCoercible - returns None for all falsy values
 * @property {<T>(opts: Option<T>[]) => Option<T[]>} all - returns Some<T[]> if all elements are Some
 * @property {<T>(opts: Option<T>[]) => Option<T>} any - returns the first instance of Some, otherwise
 *
 * @example
 * ```typescript
 * import { assert } from "./assert.ts";
 * import { Option, None, Some } from "./option.ts";
 *
 * const str: string | undefined = "thing";
 * const undef: string | undefined = undefined;
 *
 * const some: Option<string> = Option(str);
 * const none: Option<string> = Option(undef);
 *
 * assert(some instanceof Option === true);
 * assert(none instanceof Option === true);
 * assert(some.isSome() === true);
 * assert(none.isNone() === true);
 * ```
 */
export type Option<T> = Some<T> | None;
export function Option<T>(value: T): Option<NonNullish<T>> {
  return isNotNullish(value) ? Some(value) : None;
}
/**
 * Unfortunately TypeScript still doesn't support ECMA standard symbol for type narrowing
 * https://github.com/microsoft/TypeScript/issues/39064
 */
Object.defineProperty(Option, Symbol.hasInstance, {
  value: (lhs: unknown): lhs is Option<unknown> => {
    return lhs instanceof _Some || lhs instanceof _None;
  },
});
Object.defineProperty(Option, Symbol.toStringTag, {
  value: "eitherway::Option",
});

//deno-lint-ignore no-namespace
export namespace Option {
  /**
   * Alias for Option()
   *
   * @category Option::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const str: string | undefined = "thing";
   * const undef: string | undefined = undefined;
   *
   * const some: Option<string> = Option.from(str);
   * const none: Option<string> = Option.from(undef);
   *
   * assert(some instanceof Option === true);
   * assert(none instanceof Option === true);
   * assert(some.isSome() === true);
   * assert(none.isNone() === true);
   * ```
   */
  export function from<T>(value: T): Option<NonNullish<T>> {
    return isNotNullish(value) ? Some(value) : None;
  }

  /**
   * Use this if instances of `Error` should be evaluated to `None`
   *
   * Behaves like Option.from() but also returns None for instances of Error
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const str = "thing" as string | undefined;
   * const undef = undefined as string | undefined;
   * const err = new Error() as string | Error | TypeError;
   *
   * const some: Option<string> = Option.fromFallible(str);
   * const none: Option<string> = Option.fromFallible(undef);
   * const alsoNone: Option<string> = Option.fromFallible(err);
   *
   * assert(some instanceof Option === true);
   * assert(none instanceof Option === true);
   * assert(alsoNone instanceof Option === true);
   * assert(some.isSome() === true);
   * assert(none.isNone() === true);
   * assert(alsoNone.isNone() === true);
   * ```
   */
  export function fromFallible<T>(value: T): Option<Infallible<T>> {
    if (isInfallible(value)) return Option.from(value);
    return None;
  }

  /**
   * Use this if all falsy values should be evaluated to `None`
   *
   * Behaves like Option.from() but returns None for falsy values
   * This is also reflected in the return type in case of unions
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * type Bit = 1 | 0;
   * type Maybe = "thing" | "";
   * const str = "" as Maybe;
   * const bit = 0 as Bit;
   *
   * const some: Option<"thing"> = Option.fromCoercible(str);
   * const none: Option<1> = Option.fromCoercible(bit);
   *
   * assert(some instanceof Option === true);
   * assert(none instanceof Option === true);
   * assert(some.isSome() === true);
   * assert(none.isNone() === true);
   * ```
   */
  export function fromCoercible<T>(value: T): Option<Truthy<T>> {
    if (isTruthy(value)) return Option.from(value);
    return None;
  }

  /**
   * Use this to apply an `Option<T>` to a handler of type `Option<MapFn>`
   *
   * |  fn( arg )      |   arg: Some<T> |   arg: None   |
   * |-----------------|----------------|---------------|
   * | fn: Some<MapFn> | Some<MapFn<T>> |     None      |
   * | fn:    None     |      None      |     None      |
   *
   * This emulates the typical behavior of `Applicative` in functional
   * languages
   *
   * NOTE: `Some<T>` and `None` are not applicative functors
   * as this capability is exposed via the type/namespace and not the
   * instances
   *
   * See [`Applicative`](https://en.wikipedia.org/wiki/Applicative_functor)
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * type UserRecord = {
   *   name: string;
   *   email: string;
   *   role: string;
   *   org: string;
   *   lastSeen: Date;
   *   scopes: string[];
   * }
   * const record: UserRecord = {
   *   name: "Allen",
   *   email: "allen@example.com",
   *   role: "Staff",
   *   org: "Sales",
   *   lastSeen: new Date(2023,2, 23),
   *   scopes: ["read:sales", "write:sales", "read:customer"],
   * }
   *
   * const extractScopes = (rec: UserRecord): string[] => rec.scopes;
   * const maybeAction = Option.from(extractScopes);
   * const maybeRec = Option.from(record);
   *
   * const maybeScopes = Option.apply(maybeAction, maybeRec);
   *
   * assert(maybeScopes.isSome() === true);
   * ```
   */
  export function apply<Args extends Readonly<unknown>, R>(
    fn: Option<(args: Args) => R>,
    arg: Option<Args>,
  ): Option<NonNullish<R>> {
    const argTuple = Options.all([fn, arg] as const);

    if (argTuple.isNone()) return None;

    return argTuple.andThen(([fn, arg]) => Option.from(fn(arg)));
  }

  /**
   * Use this to return the provided instance of `Option<T>`
   * Mostly usefull for flattening or en lieu of a no-op
   *
   * @category Option::Basic
   */
  export function id<T>(
    opt: Readonly<Option<T>> | Option<T>,
  ): Option<T> {
    return opt.id();
  }

  /**
   * Use this to compose functions and `Option` constructors
   *
   * Allows interleaving a given chain of operations on instances of type
   * `Option<T>` with (sort of) arbirtrary operations by lifting them into
   * an `Option` context
   *
   * This is useful in situations, where it's necessary to perform computations
   * on the wrapped value of type `<T>`, but the available functions are
   * invariant over the provided `map()` or `andThen()` methods' parameters
   *
   * Furthermore, it allows for composing functions with custom `Option`
   * constructors to preserve certain invariants
   *
   * @category Option::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * // Suppose this function is imported from a fancy library
   * function chainDivide(n: number, ...divisors: number[]) {
   *   return divisors.reduce((acc, divisor) => acc /= divisor, n);
   * }
   *
   * // These two live somewhere in your codebase
   * function getDivident(): Option<number> {
   *   return Option.from(42);
   * }
   * function getDivisors(): Option<number[]> {
   *   return Option.from([7, 3, 2]);
   * }
   *
   * // We now could manually compose a function like this...
   *
   * function wrappedDiv(n: number, ...divisors: number[]) {
   *   const res = chainDivide(n, ...divisors);
   *
   *   if (
   *     res === 0 ||Number.isNaN(res) || !Number.isFinite(res)
   *   ) return None;
   *   return Some(res);
   * }
   *
   *
   * // ...or we could just use the `lift()` function with an appropriate ctor

   * const liftedDiv = Option.lift(chainDivide, Option.fromCoercible);
   *
   *
   * // If the ctor parameter is omitted, `Option.from()` is used per default
   *
   * const liftedWithDefault = Option.lift(chainDivide);
   *
   * const divident = getDivident();
   * const divisors = getDivisors();
   * const args = divident.zip(divisors);
   *
   * const someWrapped = args.andThen(args => wrappedDiv(args[0], ...args[1]));
   * const someLifted = args.andThen(args => liftedDiv(args[0], ...args[1]));
   *
   * assert(someWrapped.isSome() === true);
   * assert(someLifted.isSome() === true);
   * assert(someWrapped.unwrap() === someLifted.unwrap());
   * ```
   */
  export function lift<
    Args extends Readonly<unknown[]>,
    R1,
    R2 = NonNullish<R1>,
  >(
    fn: (...args: Args) => R1,
    ctor: (arg: R1) => Option<R2> = Option.from as (arg: R1) => Option<R2>,
  ) {
    return function (...args: Readonly<Args>): Option<R2> {
      return ctor(fn(...args));
    };
  }
}

/**
 * Utility functions to work with `Option<T>[]`
 *
 * @namespace
 */
//deno-lint-ignore no-namespace
export namespace Options {
  /**
   * Type predicate - use this to check if all values in an array are `Some<T>`
   *
   * @category Option::Basic
   */
  export function areSome<T>(
    opts: ReadonlyArray<Option<T>>,
  ): opts is Some<T>[] {
    return opts.every((opt) => opt.isSome());
  }

  /**
   * Type predicate - use this to check if all values in an array are `None`
   *
   * @category Option::Basic
   */
  export function areNone<T>(
    opts: ReadonlyArray<Option<T>>,
  ): opts is None[] {
    return opts.every((opt) => opt.isNone());
  }

  /**
   * Use this to transpose `Option<T>[]` to `Some<T[]>` if all elements are
   * `Some<T>`
   *
   * If one element is `None`, or if the input array/tuple is empty, `None`
   * is immediately returned
   *
   * This function retains type constraints like `readonly` on the input array
   * or tuple and is able to infer variadic tuples
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, Options, None, Some } from "./option.ts";
   *
   * type StrictTuple = Readonly<[string, number, boolean]>;
   * const tuple = [
   *   Option("some" as string),
   *   Option(1 as number),
   *   Option(true as boolean),
   * ] as const;
   * const empty: Option<string>[] = [];
   * const encode = JSON.stringify;
   *
   * const someTuple: Option<StrictTuple> = Options.all(tuple);
   * const emptyIsNone : Option<string[]> = Options.all(empty);
   *
   * if (someTuple.isNone() || emptyIsNone.isSome()) {
   *   throw TypeError("Unreachable in this example");
   * }
   *
   * const unwrapped: StrictTuple = someTuple.unwrap();
   * const undef: undefined = emptyIsNone.unwrap();
   *
   * assert(someTuple.isSome() === true);
   * assert(emptyIsNone.isNone() === true);
   * assert(encode(unwrapped) === encode(tuple));
   * assert(undef === undefined);
   * ```
   */
  export function all<O extends ReadonlyArray<Option<unknown>>>(
    opts: O,
  ): Option<InferredOptionTypes<O>> {
    if (opts.length === 0) return None;

    const areSome = [];

    for (const opt of opts) {
      if (opt.isNone()) {
        return None;
      } else {
        areSome.push(opt.unwrap());
      }
    }

    return Some(areSome as InferredOptionTypes<O>);
  }

  /**
   * Use this to extract the first element of type `Some<T>` from an
   * `Option<T>[]`
   *
   * If no item is `Some<T>` or the input array is empty, `None` is returned
   *
   * @category Option::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Option, Options, None, Some } from "./option.ts";
   *
   * type Prime = number;
   * const toPrime = function (n: number): Option<Prime> {
   *   if (!Number.isSafeInteger(n) || n < 2) return None;
   *   if (n % 2 === 0) return (n !== 2) ? None : Some(n);
   *   if (n % 3 === 0) return (n !== 3) ? None : Some(n);

   *   const m = Math.sqrt(n);
   *   for (let i = 5; i <= m; i += 6) {
   *     if (n % i === 0) return None;
   *     if (n % (i + 2) === 0) return None;
   *   }
   *   return Some(n);
   * };
   * const makeRange = function* (start: number, end: number) {
   *   let cursor = start;
   *   while (cursor < end) {
   *     yield cursor;
   *     cursor += 1;
   *   }
   *   return cursor;
   * };

   * const maybePrimes: Option<Prime>[] = [...makeRange(9, 19)].map(toPrime);
   * const firstPrime = Options.any(maybePrimes);
   *
   * assert(firstPrime.isSome() === true);
   * assert(firstPrime.unwrap() === 11);
   * ```
   */
  export function any<O extends ReadonlyArray<Option<unknown>>>(
    opts: O,
  ): Option<InferredOptionTypes<O>[number]> {
    const found = opts.find((opt) => opt.isSome());

    if (found) return found as Some<InferredOptionTypes<O>[number]>;
    return None;
  }
}

export type InferredOptionTypes<Opts extends ArrayLike<Option<unknown>>> = {
  [i in keyof Opts]: Opts[i] extends Option<infer T> ? T : never;
};

export type InferredSomeType<O extends Readonly<Option<unknown>>> = O extends
  Readonly<Some<infer T>> ? T : never;

export type InferredOption<O extends Readonly<Option<unknown>>> = O extends
  Readonly<None> ? None
  : O extends Readonly<Some<infer T1>> ? Some<T1>
  : [O] extends [Readonly<Option<infer T2>>] ? Option<T2>
  : never;
