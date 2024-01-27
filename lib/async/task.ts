import { asInfallible, Err, Ok, Result, Results } from "../core/mod.ts";
import type { ExecutorFn } from "./_internal/mod.ts";
import {
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
  riseTask,
  tapTask,
  tripTask,
  unwrapTask,
  unwrapTaskOr,
  unwrapTaskOrElse,
  zipTask,
} from "./_internal/mod.ts";

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
   * Use this to create a deferred `Task<T, E>` which will either succedd with 
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
   *```
   */
  static deferred<T, E>(): DeferredTask<T, E>{
    const { promise, resolve } = Task.withResolvers<Result<T, E>>();
    const task = promise as Task<T, E>;
    const succeed = (value: T) => resolve(Ok(value));
    const fail = (error: E) => resolve(Err(error));

    return { task, succeed, fail };
  }

  static from<T, E>(
    fn: () => Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    const p = new Promise<Result<T, E>>((resolve) => resolve(fn())).catch(
      asInfallible,
    );
    return new Task<T, E>((resolve) => resolve(p));
  }

  static fromPromise<T, E>(
    promise: Promise<T>,
    errorMapFn: (reason: unknown) => E,
  ): Task<T, E> {
    return Task.fromFallible(() => promise, errorMapFn);
  }

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

  trip<T2, E2>(
    tripFn: (v: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T, E | E2> {
    return Task.of(tripTask(this, tripFn));
  }

  rise<T2, E2>(
    riseFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T | T2, E> {
    return Task.of(riseTask(this, riseFn));
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

/**
 * Utilities to work with collections of Task<T, E>
 *
 * @category Task::Intermediate
 */
//deno-lint-ignore no-namespace
export namespace Tasks {
  export function all<
    P extends Readonly<ArrayLike<PromiseLike<Result<unknown, unknown>>>>,
  >(
    tasks: P,
  ): Task<InferredSuccessTuple<P>, InferredFailureUnion<P>>;
  export function all<T, E>(
    tasks: Readonly<Iterable<PromiseLike<Result<T, E>>>>,
  ): Task<T[], E>;
  //deno-lint-ignore no-explicit-any
  export function all(tasks: any): any {
    return Task.of(Promise.all(tasks).then((res) => Results.all(res)));
  }

  export function any<
    P extends Readonly<ArrayLike<PromiseLike<Result<unknown, unknown>>>>,
  >(
    tasks: P,
  ): Task<InferredSuccessUnion<P>, InferredFailureTuple<P>>;
  export function any<T, E>(
    tasks: Readonly<Iterable<PromiseLike<Result<T, E>>>>,
  ): Task<T, E[]>;
  //deno-lint-ignore no-explicit-any
  export function any(tasks: any): any {
    return Task.of(Promise.all(tasks).then((res) => Results.any(res)));
  }
}

/**
 * Use this to infer the encapsulated `<T>` type from a `Task<T,E>`
 *
 * @category Task::Basic
 */
export type InferredSuccessType<P> = P extends
  PromiseLike<Result<infer T, unknown>> ? T
  : never;

/**
 * Use this to infer the encapsulated `<E>` type from a `Task<T,E>`
 *
 * @category Task::Basic
 */
export type InferredFailureType<P> = P extends
  PromiseLike<Result<unknown, infer E>> ? E
  : never;

/**
 * Use this to infer the encapsulated `<T>` types from a tuple of `Task<T,E>`
 *
 * @category Task::Intermediate
 */
export type InferredSuccessTuple<
  P extends Readonly<ArrayLike<PromiseLike<Result<unknown, unknown>>>>,
> = {
  [i in keyof P]: P[i] extends PromiseLike<Result<infer T, unknown>> ? T
    : never;
};

/**
 * Use this to infer the encapsulated `<E>` types from a tuple of `Task<T,E>`
 *
 * @category Task::Intermediate
 */
export type InferredFailureTuple<
  P extends Readonly<ArrayLike<PromiseLike<Result<unknown, unknown>>>>,
> = {
  [i in keyof P]: P[i] extends PromiseLike<Result<unknown, infer E>> ? E
    : never;
};

/**
 * Use this to infer a union of all encapsulated `<T>` types from a tuple of `Task<T,E>`
 *
 * @category Task::Intermediate
 */
export type InferredSuccessUnion<
  P extends Readonly<ArrayLike<PromiseLike<Result<unknown, unknown>>>>,
> = InferredSuccessTuple<P>[number];

/**
 * Use this to infer a union of all encapsulated `<E>` types from a tuple of `Task<T,E>`
 *
 * @category Task::Intermediate
 */
export type InferredFailureUnion<
  P extends Readonly<ArrayLike<PromiseLike<Result<unknown, unknown>>>>,
> = InferredFailureTuple<P>[number];
