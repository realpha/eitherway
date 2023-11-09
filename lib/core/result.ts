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

export interface IResult<T, E> {
  isOk(): this is Ok<T>;
  isErr(): this is Err<E>;
  id(): Result<T, E>;
  clone(): Result<T, E>;
  map<T2>(mapFn: (value: T) => T2): Result<T2, E>;
  mapOr<T2>(mapFn: (value: T) => T2, orValue: T2): Ok<T2>;
  mapOrElse<T2>(mapFn: (value: T) => T2, elseFn: (err: E) => T2): Ok<T2>;
  mapErr<E2>(mapFn: (err: E) => E2): Result<T, E2>;
  andThen<T2, E2>(
    thenFn: (value: T) => Result<T2, E2>,
  ): Err<E> | Result<T2, E2>;
  orElse<T2, E2>(elseFn: (err: E) => Result<T2, E2>): Ok<T> | Result<T2, E2>;
  and<T2, E2>(rhs: Result<T2, E2>): Err<E> | Result<T2, E2>;
  or<T2, E2>(rhs: Result<T2, E2>): Ok<T> | Result<T2, E2>;
  zip<T2, E2>(rhs: Result<T2, E2>): Ok<[T, T2]> | Err<E> | Err<E2>;
  unwrap(): T | E;
  unwrapOr<T2>(orValue: T2): T | T2;
  unwrapOrElse<T2>(elseFn: (err: E) => T2): T | T2;
  toTuple(): [T, never] | [never, E] | [never, never];
  ok(): Option<T>;
  err(): Option<E>;
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
  tap(tapFn: (res: Result<T, E>) => void): Result<T, E>;
  inspect(inspectFn: (value: T) => void): Result<T, E>;
  inspectErr(inspectFn: (err: E) => void): Result<T, E>;
  trip<T2, E2>(tripFn: (value: T) => Result<T2, E2>): Result<T, E> | Err<E2>;
  rise<T2, E2>(riseFn: (err: E) => Result<T2, E2>): Result<T, E> | Ok<T2>;

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
  toTuple(): [T, never] {
    return [this.#value, undefined as never];
  }
  ok(): Option<NonNullish<T>> {
    return Option(this.#value);
  }
  err(): Option<never> {
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
    const clone = this.clone().unwrap();
    const lhs = thenFn(clone);

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
  *[Symbol.iterator](): IterableIterator<
    T extends Iterable<infer U> ? U : never
  > {
    const target = Object(this.#value);
    if (Symbol.iterator in target) yield* target;
    return;
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
    const clone = this.clone().unwrap();
    const lhs = riseFn(clone);

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
}

/**
 * ==============
 *   MODULE API
 * ==============
 *
 * By leveraging declaration merging and the fact that types and values
 * live in seperate namespaces, the API feels way more ergonomic
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
export type Result<T, E> = Ok<T> | Err<E>;
export function Result<T, E extends Error>(value: T | E) {
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
  export function lift<Args extends unknown[], R, T = R, E = never>(
    fn: (...args: Args) => R,
    ctor: (arg: R) => Result<T, E> = Ok as (arg: R) => Result<T, E>,
  ) {
    return function (...args: Args): Result<T, E> {
      try {
        return ctor(fn(...args));
      } catch (e) {
        throw asInfallible(e);
      }
    };
  }
  export function liftFallible<Args extends unknown[], R, E, T = R>(
    fn: (...args: Args) => R,
    errMapFn: (e: unknown) => E,
    ctor: (arg: R) => Result<T, E> = Ok as (arg: R) => Result<T, E>,
  ) {
    return function (...args: Args): Result<T, E> {
      try {
        return ctor(fn(...args));
      } catch (e) {
        return Err(errMapFn(e));
      }
    };
  }
}

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
