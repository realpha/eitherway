//deno-lint-ignore-file no-unused-vars
/**
 * NOTE: the "no-unused-vars" lint rule is ignored in order to ensure
 * method signatures are symetrical
 */
import { assert } from "../deps.ts";
import type {
  JsonRepr,
  NonNullish,
  StringRepr,
  Truthy,
  ValueRepr,
} from "./type_utils.ts";
import {
  hasToJSON,
  isNotNullish,
  isPrimitive,
  isTruthy,
} from "./type_utils.ts";

/**
 * ==============
 * BASE INTERFACE
 * ==============
 */

export interface IOption<T> {
  /**
   * Type predicate - use this to narrow an `Option<T>` to `Some<T>`
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * Use this to transform `Some<T>` to `Some<U>` by applying the supplied
   * `mapFn` to the immutable, wrapped value of type `<T>`
   * Produces a new instance of `Some`
   *
   * In case of `None`, this method short-circuits and returns `None`
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const toUpperCase = String.prototype.toUpperCase.call;
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const toUpperCase = String.prototype.toUpperCase.call;
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const toUpperCase = String.prototype.toUpperCase.call;
   * const elseFn = () => "SOMETHING";
   * const some = Some("something");
   * const none = None;
   *
   * const someUppercased = some.mapOr(toUpperCase, elseFn);
   * const someDefault = none.mapOr(toUpperCase, elseFn);
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   *   .andThen(randomize)                // -> None; short-circuit'd
   *   .andThen(greaterThanTen);          // -> same as above
   *
   * const less = small
   *   .andThen(randomize)                // -> Some<number>
   *   .andThen(greaterThanTen);          // -> None
   *
   * const greater = big
   *   .andThen(randomize)                // -> Some<number>
   *   .andThen(greaterThanTen);          // -> Some<number>
   *
   * const flattened = nested             // -> Some<Some<number>>
   *   .andThen(Option.identity<number>)  // -> Some<number>
   *   .andThen(greaterThanTen);          // -> Some<number>
   *
   * assert(alwaysNone.isNone() === true);
   * assert(less.isNone() === true);
   * assert(greater.isSome() === true);
   * assert(flattened.isSome() === true);
   * ```
   */
  andThen<U>(thenFn: (arg: Readonly<T>) => Option<U>): Option<U>;

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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * Logical AND ( && )
   * Returns RHS if LHS is `Some<T>`
   *
   * |  LHS  &&  RHS  | RHS: Some<U> |  RHS: None  |
   * |----------------|--------------|-------------|
   * |  LHS: Some<T>  |    Some<U>   |     None    |
   * |  LHS:  None    |      None    |     None    |
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * ```markdown
   * |  LHS  ||  RHS  | RHS: Some<U> |  RHS: None  |
   * |----------------|--------------|-------------|
   * |  LHS: Some<T>  |    Some<T>   |   Some<T>   |
   * |  LHS:  None    |    Some<U>   |    None     |
   * ```
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * The `tapFn` receives a deep clone of `Option<T>`, by applying the
   * `structuredClone()` algorithm on the wrapped value
   *
   * This may have performance implications, dependending on the size of
   * the wrapped value `<T>`, but ensures that the `tapFn` can never
   * change or invalidate the state of the `Option<T>` instance
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/structuredClone}
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   *     delete rec.name;
   *     delete rec.email;
   *     console.log(JSON.stringify(rec));
   *   }
   *   console.log("No UserRecord found!");
   * };
   *
   * const maybeUserRec = Option.from(getUserRecord("1"));
   * const maybeEmail = maybeUserRec
   *                     .tap(logMut) // stdout: "{"id":"1"}"
   *                     .map((rec) => rec.email);
   *
   * assert(maybeEmail.unwrap() === "allen@example.com");
   */
  tap(tapFn: <T>(arg: Option<T>) => void): Option<T>;

  /**
   * Use this to get the full string tag
   * Short-hand for `Object.prototype.toString.call(option)`
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * See the [`reference`]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description}
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString}
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf}
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * Delegates to the implementation of the wrapped value `<T>` or exhausts
   * the iterator by returning `{ done: true, value: T }` if `<T>` doesn't
   * implement the iterator protocol
   *
   * `None` represents the empty iterator and yields the empty iterator result
   * `{ done: true, value: undefined }`
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator)
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
  [Symbol.iterator](): IterableIterator<T extends Iterable<infer U> ? U : T>;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * `<T>` if it already is a primitive value
   *
   * This method *ALWAYS* returns a primitive value, as required by the spec
   * In case of keyed/indexed collection types, their `string` representation
   * will be returned
   *
   * In case of `None` the spec required hints produce the following values:
   *  - "string" -> ""
   *  - "number" -> 0
   *  - "default"? -> false
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion)
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const rec = Some({ a: 1, b: 2 });
   * const str = Some("abc");
   * const none = None;
   *
   * const toString = Object.prototype.toString;
   *
   * assert(toString.call(rec) === "eitherway::Option::Some<[object Object]>");
   * assert(toString.call(str) === "eitherway::Option::Some<abc>");
   * assert(toString.call(none) === "eitherway::Option::None");
   * assert(toString.call(Option) === "eitherway::Option");
   * assert(toString.call(Some) === "eitherway::Option::Some");
   * assert(toString.call(None) === "eitherway::Option::None");
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
  andThen<U>(thenFn: (arg: never) => Option<U>): None {
    return this;
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
  tap(tapFn: (arg: Option<never>) => void) {
    tapFn(None);
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
  *[Symbol.iterator](): IterableIterator<never> {
    /**
     * This is actually what we want, since returning from a generator implies
     * that it's exhausted, i.e. { done: true, value: undefined }
     */
    return undefined;
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
  map<U>(mapFn: (arg: Readonly<T>) => NonNullish<U>): Some<NonNullish<U>> {
    return Some(mapFn(this.#value));
  }
  mapOr<U>(
    mapFn: (arg: Readonly<T>) => NonNullish<U>,
    orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  mapOrElse<U>(
    mapFn: (arg: Readonly<T>) => NonNullish<U>,
    elseFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  andThen<U>(thenFn: (arg: Readonly<T>) => Option<U>): Option<U> {
    return thenFn(this.#value);
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
    tapFn(Some(structuredClone(this.#value)));
    return this;
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
  *[Symbol.iterator](): IterableIterator<T extends Iterable<infer U> ? U : T> {
    const target = Object(this.#value);
    if (Symbol.iterator in target) yield* target;
    return this.#value;
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

/*
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
 * import { assert } from "../deps.ts";
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
 * {@linkcode None} represents the absence of a value and is the opinionated, composable
 * equivalent of `undefined` with "sane" defaults.
 *
 * It can be [coerced to the falsy representation of primitive types]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion}
 * Furthermore, it implements the iterator protocol and returns `undefined`
 * when it gets JSON encoded via JSON.stringify()
 *
 * Please checkout {@linkcode Some} for the opposite case.
 *
 * @implements {IOption<never>} - {@linkcode IOption} Base interface
 *
 * @example
 * ```typescript
 * import { assert } from "../deps.ts";
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
 * Furthermore, it's important to note that T itself must not be nullish
 * It's impossible to end up with an instance of `Some<null | undefined>`,
 * as this is enforced by the Option<T> factory function(s)
 *
 * @satisfies {IOption<T>} - {@linkcode IOption} Base interface
 *
 * The namespace provides additional factory functions when it's desired that
 * the return type is invariant over fallible (i.e. Error) or falsy types
 *
 * @property {<T>(value: T) => Option<NonNullish<T>>} from - alias for Option()
 * @property {<T>(value: T | Error) => Option<NonNullish<T>>} fromFallible - returns None for instances of Error
 * @property {<T>(value: T) => Option<Truthy<T>>} fromCoercible - returns None for all falsy values
 *
 * @example
 * ```typescript
 * import { assert } from "../deps.ts";
 * import { Option, None, Some } from "./option.ts";
 *
 * const str: string | undefined = "thing";
 * const undef: string | undefined = undefined;
 *
 * const some: Option<string> = Option(str);
 * const none: Option<string> = Option.from(undef); //same a above
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

export type InferredOptionTypes<Opts extends ArrayLike<Option<unknown>>> = {
  [i in keyof Opts]: Opts[i] extends Option<infer T> ? T : never;
};

export type InferredSomeType<O extends Readonly<Option<unknown>>> = O extends
  Readonly<Some<infer T>> ? T : never;

export type OptionIdentity<O extends Readonly<Option<unknown>>> = O extends
  Readonly<Option<infer T>> ? Option<T>
  : O extends Option<infer T> ? Option<T>
  : never;

//deno-lint-ignore no-namespace
export namespace Option {
  /**
   * Alias for Option()
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
   *
   * const str = "thing" as string | undefined;
   * const undef = undefined as string | undefined;
   * const err = new Error() as string | Error;
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
  export function fromFallible<T>(value: T | Error): Option<NonNullish<T>> {
    if (value instanceof Error) return None;
    return Option.from(value);
  }

  /**
   * Use this if all falsy values should be evaluated to `None`
   *
   * Behaves like Option.from() but returns None for falsy values
   * This is also reflected in the return type in case of unions
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
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
   * Use this to transpose `Option<T>[]` to `Some<T[]>` if all elements are
   * `Some<T>`
   *
   * If one element is `None`, or if the input array/tuple is empty, `None`
   * is immediately returned
   *
   * This function retains type constraints like `readonly` on the input array
   * or tuple and is able to infer variadic tuples
   *
   * @example
   * ```typescript
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
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
   * const someTuple: Option<StrictTuple> = Option.all(tuple);
   * const emptyIsNone : Option<string[]> = Option.all(empty);
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
   * import { assert } from "../deps.ts";
   * import { Option, None, Some } from "./option.ts";
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
   * const firstPrime = Option.any(maybePrimes);
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
   * import { assert } from "../deps.ts";
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
   *   lastSeen: new Date(2023,02, 23),
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
  export function apply<T, U>(
    fn: Option<(x: Readonly<T>) => NonNullish<U>>,
    arg: Option<T>,
  ): Option<NonNullish<U>> {
    if (fn.isNone()) {
      return None;
    }
    return arg.map(fn.unwrap());
  }

  export function areSome<T>(
    opts: ReadonlyArray<Option<T>>,
  ): opts is Some<T>[] {
    return opts.every((opt) => opt.isSome());
  }

  export function areNone<T>(
    opts: ReadonlyArray<Option<T>>
  ): opts is None[] {
    return opts.every((opt) => opt.isNone());
  }

  export function identity<T>(
    opt: Readonly<Option<T>> | Option<T>,
  ): Option<T> {
    return opt as Option<T>;
  }

  export function lift<Fn extends OptionLiftable, Ctor extends OptionCtor<ReturnType<Fn>>>(
    fn: Fn,
    ctor: OptionCtor<Fn> = Option.from,
  ): (...arg: Readonly<Parameters<Fn>>) => Option<InferredCtorReturnType<Fn, Ctor>> {
    return function (...arg: Readonly<Parameters<Fn>>) {
        return ctor(fn(arg)) as Option<InferredCtorReturnType<Fn, Ctor>>;
    };
  }
}

/**
 * Any function with an arity of 1 
 *
 * IMPORTANT: this function MUST NOT throw an exception
 *
 * @throws never
 */
//deno-lint-ignore no-explicit-any
type OptionLiftable = (arg: any) => any;
type OptionCtor<T> = (arg: T) => Option<T>;

type InferredCtorReturnType<F extends OptionLiftable, C extends OptionCtor<ReturnType<F>>> = ReturnType<C> extends Option<infer T> ? T : never;
