import { asInfallible, Err, Ok, Result } from "../core/mod.ts";
import type { ExecutorFn } from "./_internal.ts";
import {
  andEnsureTask,
  chainTaskFailure,
  chainTaskSuccess,
  cloneTask,
  inspectTaskFailure,
  inspectTaskSuccess,
  iterTask,
  mapTaskFailure,
  mapTaskSuccess,
  mapTaskSuccessOr,
  mapTaskSuccessOrElse,
  orEnsureTask,
  tapTask,
  unwrapTask,
  unwrapTaskOr,
  unwrapTaskOrElse,
  zipTask,
} from "./_internal.ts";

/**
 * This is the interface of the return value of {@linkcode Task.deferred}
 */
export interface DeferredTask<T, E> {
  task: Task<T, E>;
  succeed: (value: T) => void;
  fail: (error: E) => void;
}

/**
 * # Task<T, E>
 *
 * `Task<T, E>` is a composeable extension of `Promise<Result<T, E>>`
 *
 * It is a `Promise` sub-class, which never rejects, but always resolves.
 * Either with an `Ok<T>` or an `Err<E>`
 *
 * It supports almost the same API as {@linkcode Result} and allows for
 * the same composition patterns as {@linkcode Result}
 *
 * Furthermore, {@linkcode Tasks} exposes a few functions to ease working
 * with collections (indexed and plain `Iterable`s)
 *
 * @category Task::Basic
 */
export class Task<T, E> extends Promise<Result<T, E>> {
  private constructor(executor: ExecutorFn<T, E>) {
    super(executor);
  }

  /**
   * =======================
   *    TASK CONSTRUCTORS
   * =======================
   */

  /**
   * Use this to create a task from a `Result<T, E>` value
   *
   * @category Task::Basic
   *
   * @example
   * ```typescript
   * import { Ok, Result, Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * async function produceRes(): Promise<Result<number, TypeError>> {
   *  return Ok(42);
   * }
   *
   * const task = Task.of(produceRes());
   * ```
   */
  static of<T, E>(
    value: Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    return Task.from(() => value);
  }

  /**
   * Use this to create a `Task` which always succeeds with a value `<T>`
   *
   * @category Task::Basic
   *
   * @example
   * ```typescript
   * import { Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * const task: Task<number, never> = Task.succeed(42);
   * ```
   */
  static succeed<T>(value: T): Task<T, never> {
    return new Task((resolve) => resolve(Ok(value)));
  }

  /**
   * Use this to create a `Task` which always fails with a value `<E>`
   *
   * @category Task::Basic
   *
   * @example
   * ```typescript
   * import { Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * const task: Task<never, number> = Task.fail(1);
   * ```
   */
  static fail<E>(error: E): Task<never, E> {
    return new Task((resolve) => resolve(Err(error)));
  }

  /**
   * Use this to create a deferred `Task<T, E>` which will either succeed with
   * a value of type `<T>` or fail with a value of type `<E>`
   *
   * You have to provide the generic types explicitly, otherwise `<T, E>` will
   * be inferred as `<unknown, unknown>`
   *
   * This is mostly useful when working with push-based APIs
   *
   * @category Task::Advanced
   *
   * @example
   * ```typescript
   * import { Task } from "./task.ts";
   *
   * class TimeoutError extends Error {}
   *
   * const { task, succeed, fail } = Task.deferred<number, TimeoutError>();
   *
   * setTimeout(() => succeed(42), Math.random() * 1000);
   * setTimeout(() => fail(new TimeoutError()), 500);
   *
   * await task
   *   .inspect(console.log)
   *   .inspectErr(console.error);
   * ```
   */
  static deferred<T, E>(): DeferredTask<T, E> {
    let resolveBinding: (res: Result<T, E>) => void;
    const task = new Task<T, E>((resolve) => {
      resolveBinding = resolve;
    });
    const succeed = (value: T) => resolveBinding(Ok(value));
    const fail = (error: E) => resolveBinding(Err(error));

    return { task, succeed, fail };
  }

  /**
   * Use this to create a task from a function which returns a `Result<T, E>`
   * or `PromiseLike<Result<T, E>` value.
   *
   * This function should be infallible by contract.
   *
   * Use {@linkcode Task.fromFallible} if this is not the case.
   *
   * @category Task::Basic
   *
   * @example
   * ```typescript
   * import { Ok, Result, Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * async function produceRes(): Promise<Result<number, TypeError>> {
   *  return Ok(42);
   * }
   *
   * const task = Task.from(produceRes);
   * ```
   */
  static from<T, E>(
    fn: () => Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    const p = new Promise<Result<T, E>>((resolve) => resolve(fn())).catch(
      asInfallible,
    );
    return new Task<T, E>((resolve) => resolve(p));
  }

  /**
   * Use this to create a `Task<T, E>` from a `Promise<T>`.
   *
   * You have to provide an `errorMapFn` in case the promise rejects, so that
   * the type can be inferred.
   *
   * If you are certain(!) that the provided promise will never reject, you can
   * provide the {@linkcode asInfallible} helper from the core module.
   *
   * @category Task::Basic
   *
   * @example
   * ```typescript
   * import { asInfallible, Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * const willBeString = new Promise<string>((resolve) => {
   *   setTimeout(() => resolve("42"), 500);
   * });
   *
   * const task: Task<string, never> = Task.fromPromise(
   *   willBeString,
   *   asInfallible,
   * );
   * ```
   */
  static fromPromise<T, E>(
    promise: Promise<T>,
    errorMapFn: (reason: unknown) => E,
  ): Task<T, E> {
    return Task.fromFallible(() => promise, errorMapFn);
  }

  /**
   * Use this to construct a `Task<T, E>` from the return value of a fallible
   * function.
   *
   * @category Task::Basic
   *
   * @example
   * ```typescript
   * import { Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * async function rand(): Promise<number> {
   *   throw new TypeError("Oops");
   * }
   *
   * function toTypeError(e: unknown): TypeError {
   *   if (e instanceof TypeError) return e;
   *   return TypeError("Unexpected error", { cause: e });
   * }
   *
   * const task: Task<number, TypeError> = Task.fromFallible(
   *   rand,
   *   toTypeError,
   * )
   * ```
   */
  static fromFallible<T, E>(
    fn: () => T | PromiseLike<T>,
    errorMapFn: (reason: unknown) => E,
  ): Task<T, E> {
    const p = new Promise<T>((resolve) => resolve(fn())).then((v) => Ok(v))
      .catch((e) => Err(errorMapFn(e)));
    return new Task<T, E>((resolve) => resolve(p));
  }

  /**
   * Use this lift a function into a `Task` context, by composing the wrapped
   * function with a `Result` constructor and an error mapping function.
   *
   * If no constructor is provided, `Ok` is used as a default.
   *
   * This higher order function is especially useful to intergrate 3rd party
   * code into your `Task` pipelines.
   *
   * @category Task::Advanced
   *
   * @example
   * ```
   * import { Err, Ok, Result, Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * async function toSpecialString(s: string): Promise<string> {
   *   if (s.length % 3 === 0) return s;
   *   throw TypeError("Not confomrming to schema");
   * }
   *
   * function toTypeError(e: unknown): TypeError {
   *   if (e instanceof TypeError) return e;
   *   return TypeError("Unexpected error", { cause: e });
   * }
   *
   * const lifted = Task.liftFallible(toSpecialString, toTypeError);
   *
   * const task: Task<string, TypeError> = Task.succeed("abcd").andThen(lifted);
   * ```
   */
  static liftFallible<Args extends unknown[], R, E, T = R>(
    fn: (...args: Args) => R | PromiseLike<R>,
    errorMapFn: (reason: unknown) => E,
    ctor: (arg: R) => Result<T, E> | PromiseLike<Result<T, E>> = Ok as (
      arg: R,
    ) => Result<T, E>,
  ): (...args: Args) => Task<T, E> {
    return function (...args: Args) {
      const p = new Promise<R>((resolve) => resolve(fn(...args))).then((v) =>
        ctor(v)
      )
        .catch((e) => Err(errorMapFn(e)));
      return new Task<T, E>((resolve) => resolve(p));
    };
  }

  /**
   * ======================
   * TASK INSTANCE METHODS
   * ======================
   */

  /**
   * Use this to return the `Task` itself. Canonical identity function.
   *
   * Mostly useful for flattening or en lieu of a noop.
   *
   * This is mostly provided for compatibility with with `Result<T, E>`.
   *
   * @category Task::Basic
   */
  id(): Task<T, E> {
    return this;
  }

  clone(): Task<T, E> {
    return Task.of(cloneTask(this));
  }

  map<T2>(mapFn: (v: T) => T2 | PromiseLike<T2>): Task<T2, E> {
    return Task.of(mapTaskSuccess(this, mapFn));
  }

  mapOr<T2>(
    mapFn: (v: T) => T2 | PromiseLike<T2>,
    orValue: T2 | PromiseLike<T2>,
  ): Task<T2, never> {
    return Task.of(mapTaskSuccessOr(this, mapFn, orValue));
  }

  mapOrElse<T2>(
    mapFn: (v: T) => T2 | PromiseLike<T2>,
    orFn: (e: E) => T2 | PromiseLike<T2>,
  ): Task<T2, never> {
    return Task.of(mapTaskSuccessOrElse(this, mapFn, orFn));
  }

  mapErr<E2>(mapFn: (v: E) => E2 | PromiseLike<E2>): Task<T, E2> {
    return Task.of(mapTaskFailure(this, mapFn));
  }

  andThen<T2, E2>(
    thenFn: (v: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T2, E | E2> {
    return Task.of(chainTaskSuccess(this, thenFn));
  }

  orElse<T2, E2>(
    elseFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T | T2, E2> {
    return Task.of(chainTaskFailure(this, elseFn));
  }

  /**
   * Use this to conditionally pass-through the encapsulated value `<T>`
   * based upon the outcome of the supplied `ensureFn`.
   *
   * In case of `Err<E>`, this method short-circuits.
   *
   * In case of `Ok<T>`, the supplied `ensureFn` is called with the encapsulated
   * value `<T>` and if the return value is:
   *  - `Ok<T2>`: it is discarded and the original `Ok<T>` is returned
   *  - `Err<E2>`: `Err<E2>` is returned
   *
   * See {@linkcode Task#orEnsure} for the opposite case.
   *
   * This is equivalent to chaining:
   * `original.andThen(ensureFn).and(original)`
   *
   * |**LHS andEnsure RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:-------------------:|:-------------:|:--------------:|
   * |  **LHS: Ok<T>**     |     Ok<T>     |     Err<E2>    |
   * |  **LHS: Err<E>**    |     Err<E>    |     Err<E>     |
   *
   * @category Task::Advanced
   *
   * @example
   * ```typescript
   * import { Task } from "./task.ts";
   *
   * declare function getPath(): Task<string, Error>;
   * declare function isReadableDir(path: string): Task<void, TypeError>;
   * declare function getFileExtensions(path: string): Task<string[], Error>;
   *
   * getPath()
   *   .andEnsure(isReadableDir)
   *   .andThen(getFileExtensions)
   *   .inspect((exts: string[]) => console.log(exts))
   *   .inspectErr((err: Error | TypeError) => console.log(err))
   * ```
   */
  andEnsure<T2, E2>(
    ensureFn: (v: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T, E | E2> {
    return Task.of(andEnsureTask(this, ensureFn));
  }

  /**
   * Use this to conditionally pass-through the encapsulated value `<E>`
   * based upon the outcome of the supplied `ensureFn`.
   *
   * In case of `Ok<T>`, this method short-circuits.
   *
   * In case of `Err<E>`, the supplied `ensureFn` is called with the encapsulated
   * value `<E>` and if the return value is:
   *  - `Ok<T2>`: it is returned
   *  - `Err<T2>`: it is discarded and the original `Err<E>` is returned
   *
   * See {@linkcode Task#andEnsure} for the opposite case.
   *
   * This is equivalent to chaining:
   * `original.orElse(ensureFn).or(original)`
   *
   * |**LHS orEnsure RHS**|**RHS: Ok<T2>**|**RHS: Err<E2>**|
   * |:------------------:|:-------------:|:--------------:|
   * |  **LHS: Ok<T>**    |     Ok<T>     |     Ok<T>      |
   * |  **LHS: Err<E>**   |     Ok<T2>    |     Err<E>     |
   *
   * @category Task::Advanced
   *
   * @example
   * ```typescript
   * import { Task } from "./task.ts";
   *
   * declare function getConfig(): Task<string, RangeError>;
   * declare function getFallback(err: RangeError): Task<string, Error>;
   * declare function configureService(path: string): Task<void, TypeError>;
   *
   * getConfig()
   *   .orEnsure(getFallback)
   *   .andThen(configureService)
   *   .inspect((_: void) => console.log("Done!"))
   *   .inspectErr((err: RangeError | TypeError) => console.log(err))
   * ```
   */
  orEnsure<T2, E2>(
    ensureFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T | T2, E> {
    return Task.of(orEnsureTask(this, ensureFn));
  }

  zip<T2, E2>(
    rhs: Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<[T, T2], E | E2> {
    return Task.of(zipTask(this, rhs));
  }

  tap(tapFn: (v: Result<T, E>) => void | PromiseLike<void>): Task<T, E> {
    return Task.of(tapTask(this, tapFn));
  }

  inspect(inspectFn: (v: T) => void | PromiseLike<void>): Task<T, E> {
    return Task.of(inspectTaskSuccess(this, inspectFn));
  }

  inspectErr(inspectFn: (v: E) => void | PromiseLike<void>): Task<T, E> {
    return Task.of(inspectTaskFailure(this, inspectFn));
  }

  /**
   * @deprecated (will be removed in 1.0.0) use {@linkcode Task#andEnsure} instead
   */
  trip<T2, E2>(
    tripFn: (v: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T, E | E2> {
    return Task.of(andEnsureTask(this, tripFn));
  }

  /**
   * @deprecated (will be removed in 1.0.0) use {@linkcode Task#orEnsure} instead
   */
  rise<T2, E2>(
    riseFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T | T2, E> {
    return Task.of(orEnsureTask(this, riseFn));
  }

  unwrap(): Promise<T | E> {
    return unwrapTask(this);
  }

  unwrapOr<T2>(orValue: T2 | PromiseLike<T2>): Promise<T | T2> {
    return unwrapTaskOr(this, orValue);
  }

  unwrapOrElse<T2>(orFn: (e: E) => T2 | PromiseLike<T2>): Promise<T | T2> {
    return unwrapTaskOrElse(this, orFn);
  }

  /**
   * Use this to obtain an async iterator of the encapsulated value `<T>`
   *
   * In case of failure, this method returns the empty `AsyncIteratorResult`
   *
   * @category Task::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "../core/assert.ts"
   * import { Err, Ok, Result, Task } from "https://deno.land/x/eitherway/mod.ts";
   *
   * const success = Task.succeed(42);
   * const failure = Task.fail(Error());
   *
   * async function main() {
   *   const okIter = success.iter();
   *   const errIter = failure.iter();
   *
   *   let okCount = 0;
   *   let okYieldedValue = undefined;
   *
   *   for await (const v of okIter) {
   *     okCount += 1;
   *     okYieldedValue = v;
   *   }
   *
   *   let errCount = 0;
   *   let errYieldedValue = undefined;
   *
   *   for await (const v of errIter) {
   *     errCount += 1;
   *     errYieldedValue = v;
   *   }
   *
   *   assert(okCount === 1);
   *   assert(okYieldedValue === 42);
   *   assert(errCount === 0)
   *   assert(errYieldedValue === undefined);
   * }
   *
   * main().then(() => console.log("Done"));
   * ```
   */
  iter(): AsyncIterableIterator<T> {
    return iterTask(this);
  }

  /**
   * ============================
   * WELL-KNOWN SYMBOLS & METHODS
   * ============================
   */

  /**
   * Use this to get the full string tag
   * Short-hand for `Object.prototype.toString.call(task)`
   *
   * See the [reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)
   *
   * @category Result::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "../core/assert.ts";
   * import { Task } from "./task.ts"
   *
   * const tag = Task.succeed(42).toString();
   *
   * assert(tag === "[object eitherway::Task]");
   * ```
   */
  toString(): string {
    return Object.prototype.toString.call(this);
  }

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
   * @category Task::Advanced
   *
   * @example
   * ```typescript
   * import { assert } from "../core/assert.ts";
   * import { Task } from "./task.ts"
   *
   * const task = Task.succeed({ a: 1, b: 2 });
   *
   * const toString = Object.prototype.toString;
   *
   * assert(toString.call(task) === "[object eitherway::Task]");
   * assert(toString.call(Task) === "[object eitherway::Task]");
   * ```
   */
  get [Symbol.toStringTag](): string {
    return "eitherway::Task";
  }
  static get [Symbol.toStringTag](): string {
    return "eitherway::Task";
  }

  /**
   * In case of success AND that the encapsulated value `<T>` implements the
   * async iterator protocol, this delegates to the underlying implementation
   *
   * In all other cases, it yields the empty `AsyncIteratorResult`
   *
   * @category Task::Advanced
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<
    T extends AsyncIterable<infer U> ? U : never
  > {
    const res = await this;

    if (res.isErr()) return;

    const target = Object(res.unwrap());

    if (!target[Symbol.asyncIterator]) return;

    yield* target;
  }
}
