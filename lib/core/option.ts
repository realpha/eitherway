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

interface IOption<T> {
  isSome: () => this is Some<T>;
  isNone: () => this is None;
  map: <U>(mapFn: (arg: T) => NonNullish<U>) => Option<NonNullish<U>>;
  mapOr: <U>(
    mapFn: (arg: T) => NonNullish<U>,
    orValue: NonNullish<U>,
  ) => Option<NonNullish<U>>;
  mapOrElse: <U>(
    mapFn: (arg: T) => NonNullish<U>,
    orFn: () => NonNullish<U>,
  ) => Option<NonNullish<U>>;
  andThen: <U>(thenFn: (arg: T) => Option<U>) => Option<U>;
  unwrap: () => T | undefined;
  unwrapOr: <U>(orValue: NonNullish<U>) => T | NonNullish<U>;
  unwrapOrElse: <U>(orFn: () => NonNullish<U>) => T | NonNullish<U>;
  and: <U>(rhs: Option<U>) => Option<T> | Option<U>;
  or: <U>(rhs: Option<U>) => Option<T> | Option<U>;
  xor: <U>(rhs: Option<U>) => Option<T> | Option<U>;
  tap: (tapFn: (arg: Option<T>) => never) => Option<T>;
  toJSON: () => JsonRepr<T>;
  toString: () => StringRepr<T>;
  valueOf: () => ValueRepr<T>;
  toTag: () => string;
  [Symbol.toStringTag]: string;
  [Symbol.toPrimitive](hint?: string): string | number | boolean | symbol;
  [Symbol.iterator](): IterableIterator<T extends Iterable<infer U> ? U : T>;
}

/**
 * ==============
 * IMPLEMENTATION
 * ==============
 */

// By declaring an unused, generic type parameter, we get a nicer alias.
class _None<T = never> implements IOption<never> {
  constructor() {}

  isSome(): this is Some<never> {
    return false;
  }
  isNone(): this is None {
    return true;
  }
  map<U>(_mapFn: (arg: never) => NonNullish<U>): None {
    return this;
  }
  mapOr<U>(
    _mapFn: (arg: never) => NonNullish<U>,
    orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return Some(orValue);
  }
  mapOrElse<U>(
    _mapFn: (arg: never) => U,
    orFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
    return Some(orFn());
  }
  andThen<U>(_thenFn: (arg: never) => Option<U>): None {
    return this;
  }
  unwrap() {
    return undefined;
  }
  unwrapOr<U>(orValue: NonNullish<U>) {
    return orValue;
  }
  unwrapOrElse<U>(orFn: () => NonNullish<U>) {
    return orFn();
  }
  /**
   * @description
   * Logical AND ( && )
   * Returns RHS if LHS is `Some<T>`
   *
   * ```markdown
   * |  A  &&  B  | B: Some<U> |  B: None  |   
   * |:----------:|:----------:|:---------:|
   * | A: Some<T> |   Some<U>  |    None   |
   * | A:  None   |    None    |    None   |
   * ```
   * 
   * @example
   * ```typescript
   * // Given a config interface...
   * type ConfigJSON = {
   *   enableDebugLogs?: boolean;
   *   enableTelemetry?: boolean;
   *   enableCrahsReports?: boolean;
   * }
   * type Config = {
   *   enableDebugLogs: Option<true>;
   *   enableTelemetry: Option<true>;
   *   enableCrahsReports: Option<true>;
   * }
   * function parseConfig(json: ConfigJSON): Config {
   *   return {
   *     enableDebugLogs: Option.fromCoercible(json.enableDebugLogs),
   *     enableTelemetry: Option.fromCoercible(json.enableTelemetry),
   *     enableCrashReports: Option.fromCoercible(json.enableCrahsReports),
   *   };
   * }
   *
   * // which may require an expensive setup...
   * async function expensiveSetup(): Promise<void> {
   *   // ...this might take a while...
   * }
   * async function selectiveSetup(c: Config): Promise<void> {
   *   // match the options here etc
   * }
   *
   * // ...its possible to decide whether or not the expnsive is necessary
   * aync function main(): Promise<void> {
   *   const configJSON = require("path/to/config.json");
   *   const config = parseConfig(configJSON);
   *
   *   const { 
   *     enableDebugLogs,
   *     enableTelemetry,
   *     enableCrahsReports,
   *   } = config;
   *
   *   if (
   *     enableDebugLogs
   *      .and(enableTelemetry)
   *      .and(enableCrahsReports)
   *      .isSome()
   *   ) {
   *     await expensiveSetup();
   *   } else {
   *     await selectiveSetup(config);
   *   }
   *    
   *   // ...continue
   * }
   * ```
   */
  and<U>(_rhs: Option<U>): None {
    return this;
  }
  /**
   * @description
   * Logical OR ( || )
   * Returns LHS if LHS is `Some<T>`, otherwise returns RHS
   *
   * ```markdown
   * |  A  ||  B  | B: Some<U> |  B: None  |   
   * |:----------:|:----------:|:---------:|
   * | A: Some<T> |   Some<T>  |  Some<T>  |
   * | A:  None   |   Some<U>  |    None   |
   * ```
   *
   * @example
   * ```typescript
   * const maybe = Option.from(undefined);
   * const default = Option.from("default");
   *
   * const res = maybe.or(default).unwrap();
   *
   * assert(res === "default");
   * ```
   */
  or<U>(rhs: Option<U>): Some<U> | None {
    return rhs;
  }
  /**
   * @description
   * Logical XOR ( ^ )
   * Useful when only one of two values should be `Some`, but not both
   * Returns `Some`, if only LHS or RHS is `Some`
   * 
   * ```markdown
   * |  A  ^  B   | B: Some<U> |  B: None  |   
   * |:----------:|:----------:|:---------:|
   * | A: Some<T> |    None    |   Some<T> |
   * | A:  None   |   Some<U>  |    None   |
   * ```
   *
   * @example
   * ```typescript
   * // A small config utility 
   * // Contrived, but should do the trick
   * type Path = string
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
   *   // here it doesn't matter which of these is `Some`
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
  xor<U>(rhs: Option<U>): Some<U> | None {
    if (rhs.isSome()) return rhs;
    return this;
  }
  /**
   * @description
   * Allows for performing side-effects transparently
   * The `tapFn` receives a deep clone of `Option<T>`, by applying the
   * `structuredClone()` function on the wrapped value
   *
   * This may have performance implications, dependending on the size of
   * the wrapped value `<T>`, but ensures that the `tapFn` can never
   * change or invalidate the state of the `Option<T>` instance
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/structuredClone}
   *
   * @example
   * ```typescript
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
   *   console.log("No UserRecord present");
   * };
   * 
   * const maybeUserRec = Option.from(getUserRecord("1"));
   * const maybeEmail = maybeUserRec
   *                     .tap(logMut) // "{"id":"1"}"
   *                     .map((rec) => rec.email);
   * 
   *
   * assert(maybeEmail.unwrap() === "allen@example.com");
   * ```
   */
  tap(tapFn: (arg: Option<never>) => void) {
    tapFn(None);
    return this;
  }
  /**
   * @description
   * This well-known symbol is called by `Object.prototype.toString` to 
   * obtain a string representation of a value's type
   *
   * This maybe useful for debugging or certain logs
   *
   * {@link Some#toTag} and {@link None#toTag} are useful short-hand
   * methods in these scenarios
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag}
   *
   * @example
   * ```typescript
   * const rec = Some({ a: 1, b: 2 });
   * const str = Some("abc");
   * const none = None;
   *
   * const toString = Object.prototype.toString.call;
   *
   * assert(toString(rec) === "eitherway::Option::Some<[object Object]>");
   * assert(toString(str) === "eitherway::Option::Some<abc>");
   * assert(toString(none) === "eitherway::Option::None");
   * assert(toString(Option) === "eitherway::Option");
   * assert(toString(Some) === "eitherway::Option::Some");
   * assert(toString(None) === "eitherway::Option::None");
   * ```
   */
  get [Symbol.toStringTag]() {
    return "eitherway::Option::None";
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or exhausts
   * the iterator by returning `{ done: true, value: T }` if `<T>` doesn't
   * implement the iterator protocol
   *
   * `None` represents the empty iterator and yields the empty iterator result
   * `{ done: true, value: undefined }`
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator}
   *
   * @example
   * ```typescript
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
  //deno-lint-ignore require-yield
  *[Symbol.iterator](): IterableIterator<never> {
    /**
     * This is actually what we want, since returning from a generator implies
     * that it's exhausted, i.e. { done: true, value: undefined }
     */
    return undefined;
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * `<T>` if it already is a primitive value
   *
   * This method *ALWAYS* returns a primitive value, as required by the spec
   *
   * In case of `None` the spec required hints produce the following values:
   *  - "string" -> ""
   *  - "number" -> 0
   *  - "default"? -> false
   * 
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion}
   *
   */
  [Symbol.toPrimitive](hint?: string): "" | 0 | false {
    if (hint === "string") return "";
    if (hint === "number") return 0;
    return false;
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * the value itself if no implementation is present
   *
   * Returns `undefined` in case of `None`
   *
   * See the [`reference`]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description}
   *
   * @example
   * ```typescript
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
  toJSON(): JsonRepr<never> {
    return undefined;
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * the empty string (i.e. `""`) in case of `None`
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString}\n
   *
   * @example
   * ```typescript
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
  toString(): StringRepr<never> {
    return "";
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * 0 in case of `None`
   *
   * Be aware that there exists an asymmetry between `Some<T>` and `None`
   * for all types except `<number>` if `<T>` doesn't implement `.valueOf()`
   * for number coercion.
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf}
   *
   *
   * @example
   * ```typescript
   * const num = Some(1);
   * const numStr = Some("1");
   * const str = Some("abc");
   * const zero = None;
   *
   * assert(num.valueOf() === 1);
   * assert(zero.valueOf() === 0);
   * assert(numStr.valueOf() === "1");
   * assert(Number(num) === 1);
   * assert(Number(zero) === 0);
   * assert(Number(numStr) === 1);
   * assert(Number.isNaN(Number("abc")));
   * assert(Number.isNaN(Number(str)));
   * ```
   */
  valueOf(): ValueRepr<never> {
    return 0;
  }
  /**
   * @description
   * Use this to get the full string tag
   * Short-hand for `Object.prototype.toString.call(option)`
   *
   * @example 
   * ```typescript
   * const someTag = Some("thing").toTag();
   * const noneTag = None.toTag();
   *
   * assert(someTag === "[object eitherway::Option::Some<thing>]");
   * assert(noneTag === "[object eitherway::Option::None]");
   * ```
   */
  toTag(): string {
    return Object.prototype.toString.call(this);
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
  map<U>(mapFn: (arg: T) => NonNullish<U>): Some<NonNullish<U>> {
    return Some(mapFn(this.#value));
  }
  mapOr<U>(
    mapFn: (arg: T) => NonNullish<U>,
    _orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  mapOrElse<U>(
    mapFn: (arg: T) => NonNullish<U>,
    _orFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  andThen<U>(thenFn: (arg: T) => Option<U>): Option<U> {
    return thenFn(this.#value);
  }
  unwrap(): T {
    return this.#value;
  }
  unwrapOr<U>(_orValue: NonNullish<U>): T {
    return this.#value;
  }
  unwrapOrElse<U>(_orFn: () => NonNullish<U>): T {
    return this.#value;
  }
  /**
   * @description
   * Logical AND ( && )
   * Returns RHS if LHS is `Some<T>`
   *
   * ```markdown
   * |  A  &&  B  | B: Some<U> |  B: None  |   
   * |:----------:|:----------:|:---------:|
   * | A: Some<T> |   Some<U>  |    None   |
   * | A:  None   |    None    |    None   |
   * ```
   * 
   * @example
   * ```typescript
   * // Given a config interface...
   * type ConfigJSON = {
   *   enableDebugLogs?: boolean;
   *   enableTelemetry?: boolean;
   *   enableCrahsReports?: boolean;
   * }
   * type Config = {
   *   enableDebugLogs: Option<true>;
   *   enableTelemetry: Option<true>;
   *   enableCrahsReports: Option<true>;
   * }
   * function parseConfig(json: ConfigJSON): Config {
   *   return {
   *     enableDebugLogs: Option.fromCoercible(json.enableDebugLogs),
   *     enableTelemetry: Option.fromCoercible(json.enableTelemetry),
   *     enableCrashReports: Option.fromCoercible(json.enableCrahsReports),
   *   };
   * }
   *
   * // which may require an expensive setup...
   * async function expensiveSetup(): Promise<void> {
   *   // ...this might take a while...
   * }
   * async function selectiveSetup(c: Config): Promise<void> {
   *   // match the options here etc
   * }
   *
   * // ...its possible to decide whether or not the expnsive is necessary
   * aync function main(): Promise<void> {
   *   const configJSON = require("path/to/config.json");
   *   const config = parseConfig(configJSON);
   *
   *   const { 
   *     enableDebugLogs,
   *     enableTelemetry,
   *     enableCrahsReports,
   *   } = config;
   *
   *   if (
   *     enableDebugLogs
   *      .and(enableTelemetry)
   *      .and(enableCrahsReports)
   *      .isSome()
   *   ) {
   *     await expensiveSetup();
   *   } else {
   *     await selectiveSetup(config);
   *   }
   *    
   *   // ...continue
   * }
   * ```
   */
  and<U>(rhs: Option<U>): Some<U> | None {
    return rhs;
  }
  /**
   * @description
   * Logical OR ( || )
   * Returns LHS if LHS is `Some<T>`, otherwise returns RHS
   *
   * ```markdown
   * |  A  ||  B  | B: Some<U> |  B: None  |   
   * |:----------:|:----------:|:---------:|
   * | A: Some<T> |   Some<T>  |  Some<T>  |
   * | A:  None   |   Some<U>  |    None   |
   * ```
   *
   * @example
   * ```typescript
   * const maybe = Option.from(undefined);
   * const default = Option.from("default");
   *
   * const res = maybe.or(default).unwrap();
   *
   * assert(res === "default");
   * ```
   */
  or<U>(_rhs: Option<U>): Some<T> {
    return this;
  }
  /**
   * @description
   * Logical XOR ( ^ )
   * Useful when only one of two values should be `Some`, but not both
   * Returns `Some`, if only LHS or RHS is `Some`
   * 
   * ```markdown
   * |  A  ^  B   | B: Some<U> |  B: None  |   
   * |:----------:|:----------:|:---------:|
   * | A: Some<T> |    None    |   Some<T> |
   * | A:  None   |   Some<U>  |    None   |
   * ```
   *
   * @example
   * ```typescript
   * // A small config utility 
   * // Contrived, but should do the trick
   * type Path = string
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
  xor<U>(rhs: Option<U>): Some<T> | None {
    if (rhs.isSome()) return None;
    return this;
  }
  /**
   * @description
   * Allows for performing side-effects transparently
   * The `tapFn` receives a deep clone of `Option<T>`, by applying the
   * `structuredClone()` function on the wrapped value
   *
   * This may have performance implications, dependending on the size of
   * the wrapped value `<T>`, but ensures that the `tapFn` can never
   * change or invalidate the state of the `Option<T>` instance
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/API/structuredClone}
   *
   * @example
   * ```typescript
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
   *   console.log("No UserRecord present");
   * };
   * 
   * const maybeUserRec = Option.from(getUserRecord("1"));
   * const maybeEmail = maybeUserRec
   *                     .tap(logMut) // "{"id":"1"}"
   *                     .map((rec) => rec.email);
   * 
   *
   * assert(maybeEmail.unwrap() === "allen@example.com");
   */
  tap(tapFn: (arg: Option<T>) => void): Option<T> {
    tapFn(new _Some(structuredClone(this.#value)));
    return this;
  }
  /**
   * @description
   * This well-known symbol is called by `Object.prototype.toString` to 
   * obtain a string representation of a value's type
   *
   * This maybe useful for debugging or certain logs
   *
   * {@link Some#toTag} and {@link None#toTag} are useful short-hand
   * methods in these scenarios
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag}
   *
   * @example
   * ```typescript
   * const rec = Some({ a: 1, b: 2 });
   * const str = Some("abc");
   * const none = None;
   *
   * const toString = Object.prototype.toString.call;
   *
   * assert(toString(rec) === "eitherway::Option::Some<[object Object]>");
   * assert(toString(str) === "eitherway::Option::Some<abc>");
   * assert(toString(none) === "eitherway::Option::None");
   * assert(toString(Option) === "eitherway::Option");
   * assert(toString(Some) === "eitherway::Option::Some");
   * assert(toString(None) === "eitherway::Option::None");
   * ```
   */
  get [Symbol.toStringTag]() {
    const innerTag = typeof this.#value === "object"
      ? Object.prototype.toString.call(this.#value)
      : String(this.#value);
    return `eitherway::Option::Some<${innerTag}>`;
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or exhausts
   * the iterator by returning `{ done: true, value: T }` if `<T>` doesn't
   * implement the iterator protocol
   *
   * `None` represents the empty iterator and yields the empty iterator result
   * `{ done: true, value: undefined }`
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator}
   *
   * @example
   * ```typescript
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
  *[Symbol.iterator](): IterableIterator<T extends Iterable<infer U> ? U : T> {
    const target = Object(this.#value);
    if (Symbol.iterator in target) yield* target;
    return this.#value;
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * `<T>` if it already is a primitive value
   *
   * This method *ALWAYS* returns a primitive value, as required by the spec
   *
   * In case of `None` the spec required hints produce the following values:
   *  - "string" -> ""
   *  - "number" -> 0
   *  - "default"? -> false
   * 
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion}
   *
   */
  [Symbol.toPrimitive](hint?: string): string | number | boolean | symbol {
    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion
     */
    if (isPrimitive(this.#value)) return this.#value;

    const target = Object(this.#value);

    if (Symbol.toPrimitive in target) {
      return target[Symbol.toPrimitive](hint);
    }
    return target.toString();
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * the value itself if no implementation is present
   *
   * Returns `undefined` in case of `None`
   *
   * See the [`reference`]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description}
   *
   * @example
   * ```typescript
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
  toJSON(): JsonRepr<T> {
    if (hasToJSON(this.#value)) return this.#value.toJSON();
    /**
     * This cast is necessary, because we need to retain the possibility of
     * T being never for the corresponding method on `None`. We know that
     * T != never for Some<T> though
     */
    return this.#value as JsonRepr<T>;
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * the empty string (i.e. `""`) in case of `None`
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString}
   *
   * @example
   * ```typescript
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
  toString(): StringRepr<T> {
    /**
     * At run time this object coercion would happen implicitely anyway for primitive types
     */
    return Object(this.#value).toString();
  }
  /**
   * @description
   * Delegates to the implementation of the wrapped value `<T>` or returns
   * 0 in case of `None`
   *
   * Be aware that there exists an asymmetry between `Some<T>` and `None`
   * for all types except `<number>` if `<T>` doesn't implement `.valueOf()`
   * for number coercion.
   *
   * See the [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf}
   *
   *
   * @example
   * ```typescript
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
  valueOf(): ValueRepr<T> {
    /**
     * At run time this object coercion would happen implicitely anyway for primitive types
     */
    return Object(this.#value).valueOf();
  }
  /**
   * @description
   * Use this to get the full string tag
   * Short-hand for `Object.prototype.toString.call(option)`
   *
   * @example 
   * ```typescript
   * const someTag = Some("thing").toTag();
   * const noneTag = None.toTag();
   *
   * assert(someTag === "[object eitherway::Option::Some<thing>]");
   * assert(noneTag === "[object eitherway::Option::None]");
   * ```
   */
  toTag(): string {
    return Object.prototype.toString.call(this);
  }
}

/*
 * ==============
 *   MODULE API
 * ==============
 * By leveraging declaration merging and the fact that types and values
 * live in seperate namespaces, the API feels way more ergonomic
 */

export type Some<T> = _Some<T>;

/**
 * *Some<T> Factory*
 * @description
 * `Some<T>` represents the encapsulation of a value of type `<T>`.
 * An instance of `Some` can only be constructed from non-nullish values,
 * so the construction explicitely asserts that the value is not nullish.
 * Use {@link Option} to create a value of type `Option<T>` if T can be
 * nullish.
 * Be aware that this is not only a compile time check, but also enforced
 * at runtime.
 *
 * `Some<T>` is a thin wrapper around `<T>`, in addition to the API one would 
 * expect, it implements the iterator protocol and delegates to the underlying
 * implementations of `<T>` when:
 *   - used as an IterableIterator (returns `<T>` if not implemented)
 *   - [coerced]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion}
 *   - encoded as JSON via JSON.stringify()
 * 
 * Please checkout {@link None} for the opposite case.
 * 
 *
 * @throws {AssertionError}
 *
 * @example
 * ```typescript
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
export function Some<T>(value: NonNullish<T>): Some<NonNullish<T>> {
  assert(
    isNotNullish(value),
    `${Some} -> Cannot construct Some with a nullish value. Received: ${value}`,
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

export type None = _None<never>;
/**
 * *None*
 * @description
 * None represents the absence of a value and is the opinionated, composable
 * equivalent of `undefined` with "sane" defaults.
 * It can be [coerced to the falsy representation of primitive types]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion}
 * Furthermore, it implements the iterator protocol and returns `undefined`
 * when it gets JSON encoded via JSON.stringify()
 *
 * Please checkout {@link Some} for the opposite case.
 *
 * @example
 * ```typescript
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

export type Option<T> = Some<T> | None;

/**
 * *Option<T> Factory*
 * @function Option
 * @description
 * Option<T> represents:
 *  - EITHER the encapsulation of a value of type T via Some<T>
 *  - OR the absence of a value via None
 *
 * It's the composable equivalent of the union <T | undefined>
 * Furthermore, it's important to note that T itself must not be
 * nullish. So it's impossible to end up with an instance of
 * Some<null | undefined>. This is enforced by the Option<T>
 * factory function(s).
 *
 * @namespace
 * The namespace provides additional factory functions when it's desired that
 * the return type is invariant over fallible (i.e. Error) or falsy types
 *
 * @property {<T>(value: T) => Option<NonNullish<T>>} from - alias for Option()
 * @property {<T>(value: T | Error) => Option<NonNullish<T>>} fromFallible - returns None for instances of Error
 * @property {<T>(value: T) => Option<Truthy<T>>} fromCoercible - returns None for all falsy values
 *
 * @example
 * ```typescript
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
   * @description
   * Alias for Option()
   *
   * @example
   * ```typescript
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
   * @description
   * Behaves like Option.from() but also returns None for instances of Error
   *
   * @example
   * ```typescript
   * const str: string | undefined = "thing";
   * const undef: string | undefined = undefined;
   * const err: string | Error = new Error();
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
   * @description
   * Behaves like Option.from() but returns None for falsy values
   * This is also reflected in the return type in case of unions
   *
   * @example
   * ```typescript
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
    if (isTruthy(value)) return new _Some(value);
    return None;
  }
}
