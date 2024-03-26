import { Result, Results } from "../core/result.ts";
import { Task } from "./task.ts";

/**
 * @module
 *
 * Utilities to work with collections of Task<T, E>
 *
 * @category Task::Intermediate
 */

/**
 * Use this to collect all `Ok<T>` values from an `Array<Task<T,E>>` or
 * `Iterable<Task<T,E>>` into an `Task<T[],E>`.
 * Upon encountring the first `Err<E>` value, this value is returned.
 *
 * This function also works on variadic tuples and preserves the individual
 * types of the tuple members.
 *
 * @category Task::Intermediate
 *
 * @example
 * ```typescript
 * import { Task, Tasks } from "./mod.ts";
 * import { Result } from "../core/result.ts";
 *
 * const str = "thing" as string | TypeError;
 * const num = 5 as number | RangeError;
 * const bool = true as boolean | ReferenceError;
 *
 * const tuple = [
 *   Task.of(Result(str)),
 *   Task.of(Result(num)),
 *   Task.of(Result(bool)),
 * ] as const;
 *
 * const res: Result<
 *   readonly [string, number, boolean],
 *   TypeError | RangeError | ReferenceError
 * > = await Tasks.all(tuple);
 * ```
 */
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

/**
 * Use this to obtain the first found `Ok<T>` from an `Array<Result<T,E>>` or
 * `Iterable<Result<T,E>>`.
 * If no `Ok<T>` value is found, the `Err<E>` values are collected into an
 * array and returned.
 *
 * This function also works on variadic tuples and preserves the individual
 * types of the tuple members.
 *
 * @category Result::Intermediate
 *
 * @example
 * ```typescript
 * import { Task, Tasks } from "./mod.ts";
 * import { Result } from "../core/result.ts";
 *
 * const str = "thing" as string | TypeError;
 * const num = 5 as number | RangeError;
 * const bool = true as boolean | ReferenceError;
 *
 * const tuple = [
 *   Task.of(Result(str)),
 *   Task.of(Result(num)),
 *   Task.of(Result(bool)),
 * ] as const;
 *
 * const res: Result<
 *   string | number | boolean,
 *   readonly [TypeError, RangeError, ReferenceError]
 * > = await Tasks.any(tuple);
 * ```
 */
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
