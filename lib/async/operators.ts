import type { Result } from "../core/mod.ts";
import {
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
  riseTask,
  tapTask,
  tripTask,
  unwrapTask,
  unwrapTaskOr,
  unwrapTaskOrElse,
  zipTask,
} from "./_internal/mod.ts";

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
 */
export function id<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return idTask(res);
  };
}

export function clone<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return cloneTask(res);
  };
}

export function map<T, T2, E>(mapFn: (v: T) => T2 | PromiseLike<T2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskSuccess(res, mapFn);
  };
}

export function mapOr<T, T2, E>(
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  orValue: T2 | PromiseLike<T2>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskSuccessOr(res, mapFn, orValue);
  };
}

export function mapOrElse<T, T2, E>(
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  elseFn: (e: E) => T2 | PromiseLike<T2>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskSuccessOrElse(res, mapFn, elseFn);
  };
}

export function mapErr<E, E2, T>(mapFn: (v: E) => E2 | PromiseLike<E2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return mapTaskFailure(res, mapFn);
  };
}

export function andThen<T, T2, E, E2>(
  thenFn: (v: T) => Result<T2, E | E2> | PromiseLike<Result<T2, E | E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return chainTaskSuccess(res, thenFn);
  };
}

export function orElse<E, T2, E2, T>(
  elseFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return chainTaskFailure(res, elseFn);
  };
}

export function zip<T2, E2, T, E>(
  rhs: Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return zipTask(res, rhs);
  };
}

export function tap<T, E>(
  tapFn: (v: Result<T, E>) => void | PromiseLike<void>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return tapTask(res, tapFn);
  };
}

export function inspect<T, E>(inspectFn: (v: T) => void | PromiseLike<void>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return inspectTaskSuccess(res, inspectFn);
  };
}

export function inspectErr<T, E>(
  inspectFn: (v: E) => void | PromiseLike<void>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return inspectTaskFailure(res, inspectFn);
  };
}

export function trip<T, T2, E2, E>(
  tripFn: (e: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return tripTask(res, tripFn);
  };
}

export function rise<E, T2, E2, T>(
  riseFn: (e: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return riseTask(res, riseFn);
  };
}

export function unwrap<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return unwrapTask(res);
  };
}

export function unwrapOr<T, E, T2>(orValue: T2 | PromiseLike<T2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return unwrapTaskOr(res, orValue);
  };
}

export function unwrapOrElse<T, E, T2>(elseFn: (e: E) => T2 | PromiseLike<T2>) {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return unwrapTaskOrElse(res, elseFn);
  };
}

export function iter<T, E>() {
  return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
    return iterTask(res);
  };
}
