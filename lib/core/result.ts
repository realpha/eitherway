//deno-lint-ignore-file no-unused-vars
/**
 * NOTE: the "no-unused-vars" lint rule is ignored in order to ensure
 * method parameter names are symetrical
 */
import type { Empty, NonNullish } from "./type_utils.ts";
import { EMPTY } from "./type_utils.ts";
import { None, Option } from "./option.ts";

/**
 * ==============
 * BASE INTERFACE
 * ==============
 */

/**
 * Base interface implemented by `Ok<T>` and `Err<E>`
 */
export interface IResult<T, E> {
  /**
   * Type predicate - use this to narrow `Result<T, E>` to `Ok<T>`
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const res = Ok(42) as Result<number, Error>;
   *
   * if (res.isOk()) {
   *   // Here we have access to the `Ok` variant
   *   const n: number = res.unwrap();
   * }
   *
   * assert(res.isOk() === true);
   * ```
   */
  isOk(): this is Ok<T>;

  /**
   * Type predicate - use this to narrow `Result<T, E>` to `Err<E>`
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const res = Err(Error()) as Result<number, Error>;
   *
   * if (res.isErr()) {
   *   // Here we have access to the `Err` variant
   *   const e: Error = res.unwrap();
   * }
   *
   * assert(res.isErr() === true);
   * ```
   */
  isErr(): this is Err<E>;

  /**
   * Use this to return the Result itself.
   *
   * Canonical identity function. Mainly useful for flattening instances of
   * `Result<Result<T, E>, E>` in combination with `.andThen()`
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const res = Ok(Err(Error())) as Result<Result<number, Error>, TypeError>;
   *
   * const flattened: Result<number, Error> = res.andThen(res => res.id());
   *
   * assert(res.isErr() === true);
   * ```
   */
  id(): Result<T, E>;

  /**
   * Use this to obtain a deep clone of `Result<T, E>`
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
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const record = { a: "thing" };
   * const ok = Ok(record);
   * const err = Err(record);
   *
   * const okClone = ok.clone();
   * const errClone = err.clone();
   *
   * assert(okClone !== ok);
   * assert(errClone !== err);
   * assert(okClone.unwrap() !== record);
   * assert(errClone.unwrap() !== record);
   * ```
   */
  clone(): Result<T, E>;

  /**
   * Use this to map the encapsulated value `<T>' to `<T2>`.
   *
   * In case of `Err<E>` this method short-circuits. See {@linkcode IResult#mapErr}
   * for the opposite case.
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const double = (n: number) => n * 2;
   * const ok = Ok(42);
   * const err = Err(Error());
   *
   * const okRes = ok.map(double);
   * const errRes = err.map(double);
   *
   * assert(okRes.isOk() === true);
   * assert(okRes.unwrap() === 84);
   * assert(errRes.isErr() === true);
   * assert(errRes === err);
   * ```
   */
  map<T2>(mapFn: (value: T) => T2): Result<T2, E>;

  /**
   * Same as `.map()` but in case of `Err<E>, a new instance
   * of `Ok`, wrapping the provided `orValue` will be returned.
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const fallback = 10;
   * const double = (n: number) => n * 2;
   * const ok = Ok(5);
   * const err = Err(Error());
   *
   * const mappedOk = ok.mapOr(double, fallback);
   * const mappedErr = err.mapOr(double, fallback);
   *
   * assert(mappedOk.isOk() === true);
   * assert(mappedOk.unwrap() === 10);
   * assert(mappedErr.isErr() === false);
   * assert(mappedErr.unwrap() === 10);
   * ```
   */
  mapOr<T2>(mapFn: (value: T) => T2, orValue: T2): Ok<T2>;

  /**
   * Same as `.map()` but in case of `Err<E>, a new instance
   * of `Ok`, wrapping the return value of the provided `elseFn` will be returned.
   *
   * Use this if the fallback value is expensive to produce.
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const fallback = (e: TypeError) => e.message.length;
   * const double = (n: number) => n * 2;
   * const ok = Ok(5);
   * const err = Err(TypeError("Booom"));
   *
   * const mappedOk = ok.mapOrElse(double, fallback);
   * const mappedErr = err.mapOrElse(double, fallback);
   *
   * assert(mappedOk.isOk() === true);
   * assert(mappedOk.unwrap() === 10);
   * assert(mappedErr.isErr() === false);
   * assert(mappedErr.unwrap() === 5);
   * ```
   */
  mapOrElse<T2>(mapFn: (value: T) => T2, elseFn: (err: E) => T2): Ok<T2>;

  /**
   * Use this to map the encapsulated value `<E>` to `<E2>`. In case of
   * `Ok<T>`, this method short-circuits. See {@linkcode IResult#map}
   * for the opposite case.
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const toTypeError = (e: Error) => TypeError("Something went wrong", { cause: e });
   * const ok = Ok(42);
   * const err = Err(Error("This went wrong"));
   *
   * const mappedOk = ok.mapErr(toTypeError);
   * const mappedErr = err.mapErr(toTypeError);
   *
   * assert(mappedOk.isOk() === true);
   * assert(mappedOk === ok);
   * assert(mappedErr.isErr() === true);
   * assert(mappedErr !== err);
   * assert(mappedErr.unwrap().cause === err.unwrap());
   * ```
   */
  mapErr<E2>(mapFn: (err: E) => E2): Result<T, E2>;

  /**
   * Use this to produce a new instance of `Result<T2, E2>` from the
   * encapsulated value `<T>`. Can be used to flatten an instance of
   * `Result<Result<T2, E2>, E>` to `Result<T2, E | E2>`.
   *
   * In case of `Err<E>`, this method short-circuits.
   *
   * See {@linkcode IResult#orElse} for the opposite case.
   *
   * Canonical `.flatMap()` or `.chain()` method.
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const processString = function(str: string): Result<number, TypeError> {
   *  if(str.length > 5) return Ok(str.length);
   *  return Err(TypeError("String too short"));
   * }
   *
   * const ok = Ok("Hello!");
   * const err = Err(TypeError("Something went wrong"));
   * const nested = Ok(Ok(42));
   *
   * const chained = ok.andThen(processString);
   * const chainedErr = err.andThen(processString);
   * const flattened = nested.andThen((r) => r.id());
   *
   * assert(chained.isOk() === true);
   * assert(chained.unwrap() === 6);
   * assert(chainedErr.isErr() === true);
   * assert(chainedErr === err);
   * assert(flattened.isOk() === true);
   * assert(flattened.unwrap() === 42);
   * ```
   */
  andThen<T2, E2>(
    thenFn: (value: T) => Result<T2, E2>,
  ): Err<E> | Result<T2, E2>;

  /**
   * Use this to produce a new instance of `Result<T2, E2>` from the
   * encapsulated value `<E>`. Can be used to flatten an instance of
   * `Result<T, Result<T2, E2>>` to `Result<T | T2, E2>`.
   *
   * In case of `Ok<T>`, this method short-circuits.
   *
   * See {@linkcode IResult#andThen} for the opposite case.
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Option, Result } from "./mod.ts";
   *
   * function recover(e: Error): Result<string, Error> {
   *   return Option(e.cause)
   *     .filter((v): v is string => typeof v === "string")
   *     .okOr(e);
   * }
   *
   * const ok = Ok("ido!");
   * const err = Err(Error("Panic!", { cause: "Fear" }));
   * const nested = Err(Ok(42));
   *
   * const chained = ok.orElse(recover);
   * const chainedErr = err.orElse(recover);
   * const flattened = nested.orElse((r) => r.id());
   *
   * assert(chained.isOk() === true);
   * assert(chained === ok);
   * assert(chainedErr.isErr() === false);
   * assert(chainedErr !== err);
   * assert(flattened.isOk() === true);
   * assert(flattened.unwrap() === 42);
   * ```
   */
  orElse<T2, E2>(elseFn: (err: E) => Result<T2, E2>): Ok<T> | Result<T2, E2>;

  /**
   * Use this to conditionally pass-through the encapsulated value `<T>`
   * based upon the outcome of the supplied `tripFn`.
   *
   * In case of `Err<E>`, this method short-circuits.
   *
   * In case of `Ok<T>`, the supplied `tripFn` is called with the encapsulated
   * value `<T>` and if the return value is:
   *  - `Ok<T2>`: it is discarded and the original `Ok<T>` is returned
   *  - `Err<E2>`: `Err<E2>` is returned
   *
   * See {@linkcode IResult#rise} for the opposite case.
   *
   * This is equivalent to chaining:
   * `original.andThen(tripFn).and(original)`
   *
   * |**LHS `trip` RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:----------------:|:-------------:|:--------------:|
   * |  **LHS: Ok<T>**  |     Ok<T>     |     Err<E2>    |
   * |  **LHS: Err<E>** |     Err<E>    |     Err<E>     |
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Empty, Err, Ok, Result } from "./mod.ts";
   * import { emptyDirSync } from "https://deno.land/std@0.207.0/fs/empty_dir.ts";
   *
   * const { BadResource, NotFound, PermissionDenied } = Deno.errors;
   * type BadResource = typeof BadResource;
   * type NotFound = typeof NotFound;
   * type PermissionDenied = typeof PermissionDenied;
   *
   * const castTo = function<E>(e: unknown): E {
   *   return e as E;
   * }
   *
   * const getPath = function(): Result<string, NotFound> {
   *   //perform a few checks...
   *   return Ok(Deno.args[0]);
   * }
   *
   * const prepareDir = Result.liftFallible(
   *   emptyDirSync,
   *   castTo<PermissionDenied>,
   * );
   *
   * const writeBlobs = function(path: string): Result<Empty, BadResource> {
   *   // create files and write something to them...
   *   return Ok.empty();
   * }
   *
   * const res = getPath()  // here we try get a path...
   *   .trip(prepareDir)    // ...and if THIS works, we pass it on...
   *   .andThen(writeBlobs) // ...so that we can process it here.
   *   .inspect((_) => console.log("done"))
   *   .inspectErr(console.error);
   *
   * assert(res.unwrap() != null);
   * ```
   */
  trip<T2, E2>(tripFn: (value: T) => Result<T2, E2>): Result<T, E> | Err<E2>;

  /**
   * Use this to conditionally pass-through the encapsulated value `<E>`
   * based upon the outcome of the supplied `riseFn`.
   *
   * In case of `Ok<T>`, this method short-circuits.
   *
   * In case of `Err<E>`, the supplied `riseFn` is called with the encapsulated
   * value `<E>` and if the return value is:
   *  - `Ok<T2>`: it is returned
   *  - `Err<T2>`: it is discarded and the original `Err<E>` is returned
   *
   * See {@linkcode IResult#trip} for the opposite case.
   *
   * This is equivalent to chaining:
   * `original.orElse(riseFn).or(original)`
   *
   * |**LHS `rise` RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:----------------:|:-------------:|:--------------:|
   * |  **LHS: Ok<T>**  |     Ok<T>     |     Ok<T>      |
   * |  **LHS: Err<E>** |     Ok<T2>    |     Err<E>     |
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const { BadResource, NotFound, PermissionDenied } = Deno.errors;
   * type BadResource = typeof BadResource;
   * type NotFound = typeof NotFound;
   * type PermissionDenied = typeof PermissionDenied;
   *
   * type Config = Record<string, string>;
   *
   * const readConfig = function(): Result<Config, NotFound> {
   *   // Oh boy, that didn't work out...
   *   return Err(NotFound("Config not found"));
   * }
   *
   * const readFallbackConfig = function(): Result<Config, PermissionDenied> {
   *   // ...also doesn't work
   *   return Err(PermissionDenied());
   * }
   *
   * const doSomething = function(cfg: Config): Result<string, BadResource> {
   *   // do some processing here...
   *   return Ok(JSON.stringify(cfg));
   * }
   *
   * const res = readConfig()      // Let's try to read the config...
   *   .rise(readFallbackConfig)   // ...try the fallback...
   *   .andThen(doSomething)       // ...but we retain the original error
   *   .inspect(console.log)       // Ok<string>
   *   .inspectErr(console.error); // Err<NotFound> | Err<BadResource>
   *
   * assert(res.isErr() === true);
   */
  rise<T2, E2>(riseFn: (err: E) => Result<T2, E2>): Result<T, E> | Ok<T2>;

  /**
   * Logical AND (`&&`)
   * Returns RHS if LHS is `Ok`, otherwise returns LHS
   *
   * |**LHS `&&` RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:--------------:|:-------------:|:--------------:|
   * |**LHS: Ok<T>**  |     Ok<T2>    |     Err<E2>    |
   * |**LHS: Err<E>** |     Err<E>    |     Err<E>     |
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42);
   * const err = Err(TypeError());
   *
   * const rhs = ok.and(err);
   * const lhs = err.and(ok);
   *
   * assert(rhs === err);
   * assert(lhs === err);
   * ```
   */
  and<T2, E2>(rhs: Result<T2, E2>): Err<E> | Result<T2, E2>;

  /**
   * Logical OR (`||`)
   * Returns RHS if LHS is `Err`, otherwise returns LHS
   *
   * |**LHS `||` RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:--------------:|:-------------:|:--------------:|
   * |**LHS: Ok<T>**  |     Ok<T>     |     Ok<T>      |
   * |**LHS: Err<E>** |     Ok<T2>    |     Err<E2>    |
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42);
   * const err = Err(TypeError());
   *
   * const lhs = ok.or(err);
   * const rhs = err.or(ok);
   *
   * assert(lhs === ok);
   * assert(rhs === ok);
   * ```
   */
  or<T2, E2>(rhs: Result<T2, E2>): Ok<T> | Result<T2, E2>;

  /**
   * Use this to zip the encapsulated values of two `Ok` instances into
   * a new `Ok` instance wrapping a tuple of them.
   *
   * In case any of the two `Result` instances is `Err`, the respective
   * `Err` instance is returned in left-to-right evaluation order.
   *
   * |**LHS `zip` RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:---------------:|:-------------:|:--------------:|
   * | **LHS: Ok<T>**  |  Ok<[T, T2]>  |     Err<E2>    |
   * | **LHS: Err<E>** |     Err<E>    |     Err<E>     |
   *
   * This is not only useful to produce tuples, but also to collect
   * arguments to be passed to a function down the line.
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const sum = function(...nums: number[]): Result<number, TypeError> {
   *   const sum = nums.reduce((acc, num) => acc + num, 0);
   *   return Ok(sum);
   * }
   *
   * const summandOne = Ok(31);
   * const summandTwo = Ok(11);
   *
   * const res = summandOne
   *   .zip(summandTwo)
   *   .andThen((nums) => sum(...nums));
   *
   * assert(res.isOk());
   * assert(res.unwrap() === 42);
   * ```
   */
  zip<T2, E2>(rhs: Result<T2, E2>): Ok<[T, T2]> | Err<E> | Err<E2>;

  /**
   * Use this to get the wrapped value out of an `Result<T, E>` instance
   *
   * Returns the wrapped value of type `<T>` in case of `Ok<T>` OR
   * `<E>` in case of `Err<E>`.
   *
   * It is necessary to narrow the instance to `Ok<T>` or `Err<E>` in
   * order to narrow the return value.
   *
   * In contrast to other implementations, this method NEVER throws an
   * exception
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42) as Result<number, string>;
   * const err = Err("Oh no") as Result<number, string>;
   *
   * let num: number = 0;
   * let str: string = "";
   *
   * if (ok.isOk()) {
   *   num = ok.unwrap();
   * }
   *
   * if (err.isErr()) {
   *   str = err.unwrap();
   * }
   *
   * const union: number | string = ok.unwrap();
   *
   * assert(num === 42);
   * assert(str === "Oh no");
   * ```
   */
  unwrap(): T | E;

  /**
   * Same as `.unwrap()` but returns a default value in case of `Err<E>`
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42) as Result<number, string>;
   * const err = Err("Oh no") as Result<number, string>;
   *
   * const num = ok.unwrapOr(0);
   * const zero = err.unwrapOr(0);
   *
   * assert(num === 42);
   * assert(zero === 0);
   * ```
   */
  unwrapOr<T2>(orValue: T2): T | T2;

  /**
   * Same as `.unwrap()` but returns a the result of the provided `elseFn` in
   * case of `Err<E>`
   *
   * Use this if the fallback value is expensive to produce
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42) as Result<number, string>;
   * const err = Err("Oh no") as Result<number, string>;
   *
   * const num = ok.unwrapOrElse(() => 0);
   * const zero = err.unwrapOr(() => 0);
   *
   * assert(num === 42);
   * assert(zero === 0);
   * ```
   */
  unwrapOrElse<T2>(elseFn: (err: E) => T2): T | T2;

  /**
   * Use this to cast an instance of `Ok<T>` or `Err<E>` to it's `Result`
   * representation. This is a safe, inherent type cast. Does not alter
   * the runtime behaviour.
   *
   * Mostly useful in the context of early returns or combination methods,
   * where an already narrowed instance would result in one of the variants
   * being inferred as `unknown` otherwise.
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const res = Ok(42);
   * const ok = Ok("success");
   *
   * const notCasted = res.and(ok);         // Result<string, unknown>
   * const casted = res.and(ok.asResult()); // Result<string, never>
   *
   * assert(casted === notCasted);
   * ```
   */
  asResult(): Result<T, E>;

  /**
   * Use this to obtain a tuple representation of `Result<T, E>`
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const res = Ok(42) as Result<number, string>;
   *
   * const [ ok, err ] = res.toTuple();
   *
   * assert(ok === 42);
   * assert(err === undefined);
   * ```
   */
  toTuple(): [T, never] | [never, E] | [never, never];

  /**
   * Use this to transform an instance of `Result<T, E>` into an `Option<T>`.
   *
   * See {@linkcode IResult#err} for the opposite case.
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42).ok();
   * const err = Err(Error()).ok();
   *
   * assert(ok.isSome() === true);
   * assert(err.isSome() === false);
   * ```
   */
  ok(): Option<T>;

  /**
   * Use this to transform an instance of `Result<T, E>` into an `Option<E>`.
   *
   * See {@linkcode IResult#ok} for the opposite case.
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42).err();
   * const err = Err(Error()).err();
   *
   * assert(ok.isSome() === false);
   * assert(err.isSome() === true);
   * ```
   */
  err(): Option<E>;

  /**
   * Use this to transform an instance of `Result<T, E>` into a type of your
   * choosing.
   *
   * This is mostly useful to push the instance into an async context.
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   * import { Task } from "../async/task.ts";
   *
   * const futureNumber = Promise.resolve(2);
   *
   * const task = Ok(42).asResult()
   *   .into((res) => Task.of(res))
   *   .map(async (n) => n * await futureNumber);
   *
   * task
   *   .then((res) => assert(res.unwrap() === 84))
   *   .catch(() => "Unreachable")
   *   .finally(() => console.log("Done"));
   * ```
   */
  into<T2>(intoFn: (res: Result<T, E>) => T2): T2;

  /**
   * Use this to obtain an iterator over the wrapped value `<T>` in case of `Ok`
   *
   * In case of `Err`, an empty iterator is returned
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const ok = Ok(42);
   * const err = Err(Error());
   *
   * let count = 0;
   * let yieldedValue = undefined;
   *
   * for (const value of ok.iter()) {
   *   count += 1;
   *   yieldedValue = value;
   * }
   *
   * let errCount = 0;
   * let errYieldedValue = undefined;
   *
   * for (const value of err.iter()) {
   *   count += 1;
   *   errYieldedValue = value;
   * }
   *
   * const fresh = ok.iter();
   * const first = fresh.next();
   * const exhausted = fresh.next();
   *
   * assert(count === 1);
   * assert(yieldedValue === 42);
   * assert(errCount === 0);
   * assert(errYieldedValue === undefined);
   * assert(first.done === false);
   * assert(first.value === 42);
   * assert(exhausted.done === true);
   * assert(exhausted.value === undefined);
   * ```
   */
  iter(): IterableIterator<T>;

  /**
   * Use this to perform side-effects transparently.
   *
   * The `tapFn` receives a deep clone of `Result<T, E>` {@linkcode IResult#clone}
   *
   * This may have performance implications, dependending on the size of
   * the wrapped value `<T | E>`, but ensures that the `tapFn` can never
   * change or invalidate the state of the `Result<T, E>` instance
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
   *
   * @category Result::Intermediate
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const record = { a: "thing" };
   * const ok = Ok(record);
   * let ref: Record<string, string> = {};
   *
   * const res = ok.tap((res) => {
   *   ref = res.unwrap();
   *   ref.a = "fling";
   * });
   *
   * assert(res === ok);
   * assert(ref !== record);
   * assert(ref.a !== record.a);
   * ```
   */
  tap(tapFn: (res: Result<T, E>) => void): Result<T, E>;

  /**
   * Use this to inspect the the encapsulated value `<T>` transparently.
   *
   * Mainly used for debugging and logging purposes.
   *
   * In case of `Err<E>`, this method short-cuits and returns the `Err<E>`
   * instance. See {@linkcode IResult#inspectErr} for the opposite case;
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const record = { a: "thing" };
   * const ok = Ok(record);
   * const err = Err(record);
   *
   * const okRes = ok.inspect(console.log);   // logs '{ a: "thing" }'
   * const errRes = err.inspect(console.log); // not called
   *
   * assert(okRes === ok);
   * assert(errRes === err);
   * ```
   */
  inspect(inspectFn: (value: T) => void): Result<T, E>;

  /**
   * Use this to inspect the the encapsulated value `<E>` transparently.
   *
   * Mainly used for debugging and logging purposes.
   *
   * In case of `Ok<T>`, this method short-cuits and returns the `Ok<T>`
   * instance. See {@linkcode IResult#inspect} for the opposite case;
   *
   * @category Result::Basic
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const record = { a: "thing" };
   * const ok = Ok(record);
   * const err = Err(record);
   *
   * const okRes = ok.inspectErr(console.log);   // not called
   * const errRes = err.inspectErr(console.log); // logs '{ a: "thing" }'
   *
   * assert(okRes === ok);
   * assert(errRes === err);
   * ```
   */
  inspectErr(inspectFn: (err: E) => void): Result<T, E>;

  /**
   * Use this to get the full string tag
   * Short-hand for `Object.prototype.toString.call(result)`
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const okTag = Ok("thing").toString();
   * const errTag = Err(Error()).toString();
   *
   * assert(okTag === "[object eitherway::Result::Ok<thing>]");
   * assert(errTag === "[object eitherway::Result::Err<[object Error]>");
   * ```
   */
  toString(): string;

  /**
   * Delegates to the implementation of the wrapped value `<T>` or exhausts
   * the iterator by returning `{ done: true, value: undefined }` if `<T>` doesn't
   * implement the iterator protocol
   *
   * `Err` represents the empty iterator and returns the empty iterator result
   * `{ done: true, value: undefined }`
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator)
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const simpleOk = Ok(42);            //`number` is not iterable
   * const delegatingOk = Ok([1, 2, 3]); //`number[]` is iterable
   * const err = Err(Error());
   *
   * let simpleCount = 0;
   * let simpleYieldedValue = undefined;
   *
   * for (const value of simpleOk) {
   *   simpleCount += 1;
   *   simpleYieldedValue = value;
   * }
   *
   * let delegatingCount = 0;
   * let delegatingYieldedValue = undefined;
   *
   * for (const value of delegatingOk) {
   *   delegatingCount += 1;
   *   delegatingYieldedValue = value;
   * }
   *
   * let errCount = 0;
   * let errYieldedValue = undefined;
   *
   * for (const value of err) {
   *   errCount += 1;
   *   errYieldedValue = value;
   * }
   *
   * assert(simpleCount === 0);
   * assert(simpleYieldedValue === undefined);
   * assert(delegatingCount === 3);
   * assert(delegatingYieldedValue === 3);
   * assert(errCount === 0);
   * assert(errYieldedValue === undefined);
   * ```
   */
  [Symbol.iterator](): IterableIterator<
    T extends Iterable<infer U> ? U : never
  >;

  /**
   * This well-known symbol is called by `Object.prototype.toString` to
   * obtain a string representation of a value's type
   *
   * This maybe useful for debugging or certain logs
   *
   * The [`.toString()`]{@link this#toString} method is a useful short-hand in these scenarios
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag)
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./result.ts";
   *
   * const rec = Ok({ a: 1, b: 2 });
   * const str = Ok("abc");
   * const err = Err(TypeError());
   *
   * const toString = Object.prototype.toString;
   *
   * assert(toString.call(rec) === "[object eitherway::Result::Ok<[object Object]>]");
   * assert(toString.call(str) === "[object eitherway::Result::Ok<abc>]");
   * assert(toString.call(err) === "[object eitherway::Result::Err<[object Error]>]");
   * assert(toString.call(Result) === "[object eitherway::Result]");
   * assert(toString.call(Ok) === "[object eitherway::Result::Ok]");
   * assert(toString.call(Err) === "[object eitherway::Result::Err]");
   * ```
   */
  [Symbol.toStringTag]: string;
}

/**
 * ==============
 * IMPLEMENTATION
 * ==============
 */

class _Ok<T> implements IResult<T, never> {
  #value: T;
  constructor(value: T) {
    this.#value = value;
  }
  isOk(): this is Ok<T> {
    return true;
  }
  isErr(): this is Err<never> {
    return false;
  }
  id(): Ok<T> {
    return this;
  }
  clone(): Ok<T> {
    return Ok(structuredClone(this.#value));
  }
  and<T2, E2>(rhs: Result<T2, E2>): Result<T2, E2> {
    return rhs;
  }
  or<T2, E2>(rhs: Result<T2, E2>): Ok<T> {
    return this;
  }
  map<T2>(mapFn: (value: T) => T2): Ok<T2> {
    return Ok(mapFn(this.#value));
  }
  mapOr<T2>(mapFn: (value: T) => T2, orValue: T2): Ok<T2> {
    return this.map(mapFn);
  }
  mapOrElse<T2>(mapFn: (value: T) => T2, elseFn: (err: never) => T2): Ok<T2> {
    return this.map(mapFn);
  }
  mapErr<E2>(mapFn: (err: never) => E2): Ok<T> {
    return this;
  }
  andThen<T2, E2>(thenFn: (value: T) => Result<T2, E2>): Result<T2, E2> {
    return thenFn(this.#value);
  }
  orElse<T2, E2>(
    elseFn: (err: never) => Result<T2, E2>,
  ): Ok<T> {
    return this;
  }
  unwrap(): T {
    return this.#value;
  }
  unwrapOr<T2>(orValue: T2): T {
    return this.#value;
  }
  unwrapOrElse<T2>(elseFn: (err: never) => T2): T {
    return this.#value;
  }
  asResult(): Result<T, never> {
    return this;
  }
  toTuple(): [T, never] {
    return [this.#value, undefined as never];
  }
  ok(): Option<NonNullish<T>> {
    return Option(this.#value);
  }
  err(): None {
    return None;
  }
  into<U>(intoFn: (res: Ok<T>) => U): U {
    return intoFn(this);
  }
  *iter(): IterableIterator<T> {
    yield this.#value;
  }
  zip<T2, E2>(rhs: Result<T2, E2>): Result<[T, T2], E2> {
    if (rhs.isErr()) return rhs;

    return Ok([this.#value, rhs.unwrap()]);
  }
  trip<T2, E2>(thenFn: (value: T) => Result<T2, E2>): Ok<T> | Err<E2> {
    const lhs = thenFn(this.#value);

    return lhs.and(this);
  }
  rise<T2, E2>(riseFn: (err: never) => Result<T2, E2>): Ok<T> {
    return this;
  }
  tap(tapFn: (value: Ok<T>) => void): Ok<T> {
    tapFn(this.clone());
    return this;
  }
  inspect(inspectFn: (value: T) => void): Ok<T> {
    inspectFn(this.#value);
    return this;
  }
  inspectErr(inspectFn: (err: never) => void): Ok<T> {
    return this;
  }
  toString(): string {
    return Object.prototype.toString.call(this);
  }
  *[Symbol.iterator](): IterableIterator<
    T extends Iterable<infer U> ? U : never
  > {
    const target = Object(this.#value);
    if (Symbol.iterator in target) yield* target;
    return;
  }
  get [Symbol.toStringTag](): string {
    const innerTag = typeof this.#value === "object"
      ? Object.prototype.toString.call(this.#value)
      : String(this.#value);
    return `eitherway::Result::Ok<${innerTag}>`;
  }
}

class _Err<E> implements IResult<never, E> {
  #err: E;
  constructor(err: E) {
    this.#err = err;
  }
  isOk(): this is Ok<never> {
    return false;
  }
  isErr(): this is Err<E> {
    return true;
  }
  id(): Err<E> {
    return this;
  }
  clone(): Err<E> {
    return Err(structuredClone(this.#err));
  }
  and<T2, E2>(rhs: Result<T2, E2>): Err<E> {
    return this;
  }
  or<T2, E2>(rhs: Result<T2, E2>): Result<T2, E2> {
    return rhs;
  }
  map<T2>(mapFn: (value: never) => T2): Err<E> {
    return this;
  }
  mapOr<T2>(mapFn: (value: never) => T2, orValue: T2): Ok<T2> {
    return Ok(orValue);
  }
  mapOrElse<T2>(mapFn: (value: never) => T2, elseFn: (err: E) => T2): Ok<T2> {
    return Ok(elseFn(this.#err));
  }
  mapErr<E2>(mapFn: (err: E) => E2): Err<E2> {
    return Err(mapFn(this.#err));
  }
  andThen<T2, E2>(thenFn: (value: never) => Result<T2, E2>): Err<E> {
    return this;
  }
  orElse<T2, E2>(elseFn: (err: E) => Result<T2, E2>): Result<T2, E2> {
    return elseFn(this.#err);
  }
  tap(tapFn: (value: Result<never, E>) => void): Err<E> {
    tapFn(this.clone());
    return this;
  }
  unwrap(): E {
    return this.#err;
  }
  unwrapOr<T2>(orValue: T2): T2 {
    return orValue;
  }
  unwrapOrElse<T2>(elseFn: (err: E) => T2): T2 {
    return elseFn(this.#err);
  }
  asResult(): Result<never, E> {
    return this;
  }
  toTuple(): [never, E] {
    return [undefined as never, this.#err];
  }
  into<T2>(intoFn: (res: Err<E>) => T2): T2 {
    return intoFn(this);
  }
  ok(): None {
    return None;
  }
  err(): Option<NonNullish<E>> {
    return Option(this.#err);
  }
  //deno-lint-ignore require-yield
  *iter(): IterableIterator<never> {
    return;
  }
  zip<T2, E2>(rhs: Result<T2, E2>): Err<E> {
    return this;
  }
  trip<T2, E2>(tripFn: (value: never) => Result<T2, E2>): Err<E> {
    return this;
  }
  rise<T2, E2>(riseFn: (err: E) => Result<T2, E2>): Ok<T2> | Err<E> {
    const lhs = riseFn(this.#err);

    return lhs.or(this);
  }
  inspect(inspectFn: (value: never) => void): Err<E> {
    return this;
  }
  inspectErr(inspectFn: (err: E) => void): Err<E> {
    inspectFn(this.#err);
    return this;
  }
  //deno-lint-ignore require-yield
  *[Symbol.iterator](): IterableIterator<never> {
    return;
  }
  get [Symbol.toStringTag](): string {
    const innerTag = typeof this.#err === "object"
      ? Object.prototype.toString.call(this.#err)
      : String(this.#err);
    return `eitherway::Result::Err<${innerTag}>`;
  }
  toString(): string {
    return Object.prototype.toString.call(this);
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
 * # Ok<T>
 *
 * The success variant of a `Result<T, E>`
 *
 * @category Result:Basic
 * @implements {@linkcode IResult}
 */
export type Ok<T> = _Ok<T>;
export function Ok<T>(value: T) {
  return new _Ok(value);
}
Object.defineProperty(Ok, Symbol.hasInstance, {
  value: function (lhs: unknown): lhs is Ok<unknown> {
    return lhs instanceof _Ok;
  },
});
Object.defineProperty(Ok, Symbol.toStringTag, {
  value: "eitherway::Result::Ok",
});
//deno-lint-ignore no-namespace
export namespace Ok {
  export function empty(): Ok<Empty> {
    return Ok(EMPTY);
  }
}

/**
 * # Err<E>
 *
 * The failure variant of a `Result<T, E>`
 *
 * @category Result:Basic
 * @implements {@linkcode IResult}
 */
export type Err<E> = _Err<E>;
export function Err<E>(err: E): Err<E> {
  return new _Err(err);
}
Object.defineProperty(Err, Symbol.hasInstance, {
  value: function (lhs: unknown): lhs is Err<unknown> {
    return lhs instanceof _Err;
  },
});
Object.defineProperty(Err, Symbol.toStringTag, {
  value: "eitherway::Result::Err",
});
//deno-lint-ignore no-namespace
export namespace Err {
  export function empty(): Err<Empty> {
    return Err(EMPTY);
  }
}

/**
 * # Result<T, E>
 *
 * `Result<T, E>` is the composeable equivalent to the union `<T | E>`, where
 * `<T>` represents the success and `<E>` the failure case
 *
 * It's the type level represenation of the union `Ok<T> | Err<E>`
 *
 * Furthermore the namespace {@linkcode Results} exposes a few functions
 * to ease working with collections of `Result<T, E>` (indexed and plain
 * Iterables)
 *
 * @implements {@linkcode IResult}
 * @category Result::Basic
 * @namespace
 */
export type Result<T, E> = Ok<T> | Err<E>;
export function Result<T, E extends Error>(value: T | E): Result<T, E> {
  if (value instanceof Error) return Err(value);
  return Ok(value);
}
Object.defineProperty(Result, Symbol.hasInstance, {
  value: function (lhs: unknown): lhs is Result<unknown, unknown> {
    return lhs instanceof _Ok || lhs instanceof _Err;
  },
});
Object.defineProperty(Result, Symbol.toStringTag, {
  value: "eitherway::Result",
});

//deno-lint-ignore no-namespace
export namespace Result {
  export function from<T>(fn: () => T): Result<T, never> {
    return Result.fromFallible(fn, asInfallible);
  }
  export function fromFallible<T, E>(
    fn: () => T,
    errMapFn: (e: unknown) => E,
  ): Result<T, E> {
    try {
      return Ok(fn());
    } catch (e) {
      return Err(errMapFn(e));
    }
  }

  /**
   * Use this to lift a function into a `Result` context, by composing
   * the wrapped function with a `Result` constructor.
   *
   * If no constructor is provided, `Ok` is used as default.
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./mod.ts";
   *
   * function powerOfTwo(n: number): number {
   *   return Math.pow(2, n);
   * }
   *
   * const lifted = Result.lift(powerOfTwo);
   *
   * const res = Ok(2).andThen(lifted);
   *
   * assert(res.isOk() === true);
   * assert(res.unwrap() === 4);
   */
  export function lift<Args extends unknown[], R, T = R, E = never>(
    fn: (...args: Args) => R,
    ctor: (arg: R) => Result<T, E> = Ok as (arg: R) => Result<T, E>,
  ): (...args: Args) => Result<T, E> {
    return function (...args: Args) {
      try {
        return ctor(fn(...args));
      } catch (e) {
        throw asInfallible(e);
      }
    };
  }

  /**
   * Use this to lift a fallible function into a `Result` context, by composing
   * the wrapped function with a `Result` constructor and an error mapping
   * function.
   *
   * If no constructor is provided, `Ok` is used as default.
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "./assert.ts";
   * import { Err, Ok, Result } from "./mod.ts";
   *
   * function toSpecialString(s: string): string {
   *   if (s.length % 3 === 0) return s;
   *   throw TypeError("Not confomrming to schema");
   * }
   *
   * function toTypeError(e: unknown): TypeError {
   *   if (e instanceof TypeError) return e;
   *   return TypeError("Unexpected error", { cause: e });
   * }
   *
   * const lifted = Result.liftFallible(toSpecialString, toTypeError);
   *
   * const res: Result<string, TypeError> = Ok("abcd").andThen(lifted);
   *
   * assert(res.isOk() === false);
   * assert(res.unwrap() instanceof TypeError === true);
   * ```
   */
  export function liftFallible<Args extends unknown[], R, E, T = R>(
    fn: (...args: Args) => R,
    errMapFn: (e: unknown) => E,
    ctor: (arg: R) => Result<T, E> = Ok as (arg: R) => Result<T, E>,
  ): (...args: Args) => Result<T, E> {
    return function (...args: Args) {
      try {
        return ctor(fn(...args));
      } catch (e) {
        return Err(errMapFn(e));
      }
    };
  }
}

/**
 * Utilities to work with collections of Result<T, E>
 *
 * @category Result::Intermediate
 */
//deno-lint-ignore no-namespace
export namespace Results {
  export function all<R extends Readonly<ArrayLike<Result<unknown, unknown>>>>(
    results: R,
  ): Result<InferredOkTuple<R>, InferredErrUnion<R>>;
  export function all<T, E>(
    results: Readonly<Iterable<Result<T, E>>>,
  ): Result<T[], E>;
  //deno-lint-ignore no-explicit-any
  export function all(results: any): any {
    const areOk = [];

    for (const res of results) {
      if (res.isErr()) return res;
      areOk.push(res.unwrap());
    }

    return Ok(areOk);
  }

  export function any<R extends Readonly<ArrayLike<Result<unknown, unknown>>>>(
    results: R,
  ): Result<InferredOkUnion<R>, InferredErrTuple<R>>;
  export function any<T, E>(
    results: Readonly<Iterable<Result<T, E>>>,
  ): Result<T, E[]>;
  //deno-lint-ignore no-explicit-any
  export function any(results: any): any {
    const areErr = [];

    for (const res of results) {
      if (res.isOk()) return res;
      areErr.push(res.unwrap());
    }

    return Err(areErr);
  }
}

/**
 * Use this to infer the encapsulated `Ok<T>` types from a `Result<T,E>`
 *
 * @category Result::Basic
 */
export type InferredOkType<R> = R extends Readonly<Result<infer T, unknown>> ? T
  : never;

/**
 * Use this to infer the encapsulated `Err<E>` types from a `Result<T,E>`
 *
 * @category Result::Basic
 */
export type InferredErrType<R> = R extends Readonly<Result<unknown, infer E>>
  ? E
  : never;

/**
 * Use this to infer the encapsulated `Ok<T>` types from a tuple of `Result<T,E>`
 *
 * @category Result::Intermediate
 */
export type InferredOkTuple<
  R extends Readonly<ArrayLike<Result<unknown, unknown>>>,
> = {
  [i in keyof R]: R[i] extends Result<infer T, unknown> ? T : never;
};

/**
 * Use this to infer the encapsulated `Err<E>` types from a tuple of `Result<T,E>`
 *
 * @category Result::Intermediate
 */
export type InferredErrTuple<
  R extends Readonly<ArrayLike<Result<unknown, unknown>>>,
> = {
  [i in keyof R]: R[i] extends Result<unknown, infer E> ? E : never;
};

/**
 * Use this to infer a union of all encapsulated `Ok<T>` types from a tuple of `Result<T,E>`
 *
 * @category Result::Intermediate
 */
export type InferredOkUnion<
  R extends Readonly<ArrayLike<Result<unknown, unknown>>>,
> = InferredOkTuple<R>[number];

/**
 * Use this to infer a union of all encapsulated `Err<E>` types from a tuple of `Result<T,E>`
 *
 * @category Result::Intermediate
 */
export type InferredErrUnion<
  R extends Readonly<ArrayLike<Result<unknown, unknown>>>,
> = InferredErrTuple<R>[number];

/**
 * Use this as `errMapFn` to indicate that a function or Promise to be lifted
 * into a Result or Task context is infallible
 *
 * If the lifted function or Promise throws an exception, the error will be
 * propagated
 *
 * @throws Error
 *
 * @category Result::Intermediate
 *
 * @example
 * ```typescript
 * import { assert } from "./assert.ts"
 * import { Err, Ok, Result, asInfallible } from "./result.ts"
 *
 * //Let's re-implement `Result.from`
 *
 * const customFromImpl = <T>(fn: () => T) => Result.fromFallible(fn, asInfallible);
 * const getNumber = () => 42;
 *
 * const fromOriginal = Result.from(getNumber);
 * const fromCustom = customFromImpl(getNumber);
 *
 * assert(fromOriginal.isOk() === fromCustom.isOk());
 * ```
 */
export function asInfallible(e: unknown): never {
  throw new Error(
    `eitherway::core -> A function you've passed as infallible threw an exception: ${e}`,
    { cause: e },
  );
}
