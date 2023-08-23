//deno-lint-ignore-file no-unused-vars
/**
 * NOTE: the "no-unused-vars" lint rule is ignored in order to ensure
 * method parameter names are symetrical
 */
import type { Empty, NonNullish } from "./type_utils.ts";
import { EMPTY } from "./type_utils.ts";
import { None, Option } from "./option.ts";

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
  tap(tapFn: (res: Result<T, E>) => void): Result<T, E>;
  trip<T2, E2>(tripFn: (value: T) => Result<T2, E2>): Result<T, E> | Err<E2>;
  rise<T2, E2>(riseFn: (err: E) => Result<T2, E2>): Result<T, E> | Ok<T2>;
}

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
  into<T2>(intoFn: (res: Ok<T>) => T2): T2 {
    return intoFn(this);
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
}

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
    return Result.fromFallible(fn, isInfallible);
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
        throw isInfallible(e);
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

export function isInfallible(e: unknown): never {
  throw new Error(
    `eitherway::core -> A function you've passed as infallible threw an exception: ${e}`,
    { cause: e },
  );
}
