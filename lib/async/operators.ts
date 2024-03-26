import type { Result } from "../core/mod.ts";
import {
  andEnsureTask,
  chainTaskFailure,
  chainTaskSuccess,
  cloneTask,
  idTask,
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
 * ======================
 *  TASK ASYNC OPERATORS
 * ======================
 */

/**
 * Use this to obtain a function, with returns the provided `Task` itself.
 * Canonical identity function.
 *
 * Mostly useful for flattening or en lieu of a noop.
 *
 * This is mostly provided for compatibility with with `Result<T, E>`.
 *
 * @category Task::Basic
 *
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function id<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return idTask(res);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function clone<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return cloneTask(res);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function map<T, T2, E>(mapFn: (v: T) => T2 | PromiseLike<T2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskSuccess(res, mapFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function mapOr<T, T2, E>(
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  orValue: T2 | PromiseLike<T2>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskSuccessOr(res, mapFn, orValue);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function mapOrElse<T, T2, E>(
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  elseFn: (e: E) => T2 | PromiseLike<T2>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskSuccessOrElse(res, mapFn, elseFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function mapErr<E, E2, T>(mapFn: (v: E) => E2 | PromiseLike<E2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskFailure(res, mapFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function andThen<T, T2, E, E2>(
  thenFn: (v: T) => Result<T2, E | E2> | PromiseLike<Result<T2, E | E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return chainTaskSuccess(res, thenFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function orElse<E, T2, E2, T>(
  elseFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return chainTaskFailure(res, elseFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function zip<T2, E2, T, E>(
  rhs: Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return zipTask(res, rhs);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function tap<T, E>(
  tapFn: (v: Result<T, E>) => void | PromiseLike<void>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return tapTask(res, tapFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function inspect<T, E>(inspectFn: (v: T) => void | PromiseLike<void>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return inspectTaskSuccess(res, inspectFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function inspectErr<T, E>(
  inspectFn: (v: E) => void | PromiseLike<void>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return inspectTaskFailure(res, inspectFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function trip<T, T2, E2, E>(
  tripFn: (e: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return andEnsureTask(res, tripFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function rise<E, T2, E2, T>(
  riseFn: (e: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return orEnsureTask(res, riseFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function unwrap<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return unwrapTask(res);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function unwrapOr<T, E, T2>(orValue: T2 | PromiseLike<T2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return unwrapTaskOr(res, orValue);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function unwrapOrElse<T, E, T2>(elseFn: (e: E) => T2 | PromiseLike<T2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return unwrapTaskOrElse(res, elseFn);
  };
}

/**
 * @deprecated (will be removed in 1.0.0) use {@linkcode Task} instead
 */
export function iter<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return iterTask(res);
  };
}
