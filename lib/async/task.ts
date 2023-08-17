import { Err, Ok, Result } from "../core/result.ts";

/**
 * These type aliases are only used internally to ease save some chars
 */
type Future<T, E> = PromiseLike<Result<T, E>>;
type Either<T, E> = Result<T, E> | Future<T, E>;
type ExecutorFn<T, E> = ConstructorParameters<typeof Promise<Result<T, E>>>[0];
type InnerUnion<T, E> = T | E | Result<T, E>;
type ThenParameters<T, E> = Parameters<Promise<Result<T, E>>["then"]>;

function noop(arg: unknown) {}

export class Task<T, E> extends Promise<Result<T, E>> {
  private constructor(executor: ExecutorFn<T, E>) {
    super(executor);
  }

  static of<T, E>(
    value: Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    return new Task<T, E>((resolve) => resolve(value));
  }

  static ok<T>(value: T): Task<T, never> {
    return Task.of(Ok(value));
  }

  static err<E>(error: E): Task<never, E> {
    return Task.of(Err(error));
  }

  static from<T, E>(
    fn: () => Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    return new Task<T, E>((resolve) => resolve(fn()));
  }

  static fromPromise<T, E = never>(
    promise: Promise<T> | (() => Promise<T>),
    errorMapFn: (reason: unknown) => E = noop as (reason: unknown) => never,
  ): Task<T, E> {
    const p = typeof promise === "function" ? promise() : promise;
    const toResolve = p.then((value: T) => Ok(value)).catch((reason: unknown) =>
      Err(errorMapFn(reason))
    );
    return new Task((resolve) => resolve(toResolve));
  }

  static fromFallible<T, E>(
    fn: () => T,
    errorMapFn: (reason: unknown) => E,
  ): Task<T, E> {
    try {
      const v = fn();
      return Task.of(Ok(v));
    } catch (e) {
      return Task.of(Err(errorMapFn(e)));
    }
  }

  static map<T, T2, E>(mapFn: (v: T) => T2 | PromiseLike<T2>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return Task.of(mapTaskSuccess(res, mapFn));
    };
  }

  static mapErr<E, E2, T>(mapFn: (v: E) => E2 | PromiseLike<E2>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return Task.of(mapTaskFailure(res, mapFn));
    };
  }

  static andThen<T, T2, E, E2>(
    thenFn: (v: T) => Result<T2, E | E2> | PromiseLike<Result<T2, E | E2>>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return Task.of(chainTaskSuccess(res, thenFn));
    };
  }

  map<T2>(mapFn: (v: T) => T2 | PromiseLike<T2>): Task<T2, E> {
    return Task.of(mapTaskSuccess(this, mapFn));
  }

  mapErr<E2>(mapFn: (v: E) => E2 | PromiseLike<E2>): Task<T, E2> {
    return Task.of(mapTaskFailure(this, mapFn));
  }

  andThen<T2, E2>(
    thenFn: (v: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): Task<T2, E | E2> {
    return Task.of(chainTaskSuccess(this, thenFn));
  }

  // map<U>(fn: (t: T) => U | Promise<U>): Task<U, E> {
  //   const task = this;
  //
  //
  // }
}

async function mapTaskSuccess<T, E, T2>(
  task: Either<T, E>,
  mapFn: (v: T) => T2 | PromiseLike<T2>,
): Promise<Result<T2, E>> {
  const res = await task;
  if (res.isErr()) return res;

  const mappedOk = await mapFn(res.unwrap());

  return Ok(mappedOk);
}

async function mapTaskFailure<T, E, E2>(
  task: Either<T, E>,
  mapFn: (v: E) => E2 | PromiseLike<E2>,
): Promise<Result<T, E2>> {
  const res = await task;
  if (res.isOk()) return res;

  const mappedErr = await mapFn(res.unwrap());

  return Err(mappedErr);
}

async function chainTaskSuccess<T, E, T2, E2>(
  task: Either<T, E>,
  thenFn: (v: T) => Either<T2, E2>,
): Promise<Result<T2, E | E2>> {
  const res = await task;
  if (res.isErr()) return res;

  return thenFn(res.unwrap());
}

async function chainTaskFailure<T, E, T2, E2>(
  task: Either<T, E>,
  elseFn: (v: E) => Either<T2, E2>,
): Promise<Result<T | T2, E2>> {
  const res = await task;
  if (res.isOk()) return res;

  return elseFn(res.unwrap());
}

async function tapTask<T, E>(
  task: Either<T, E>,
  tapFn: (v: Result<T, E>) => PromiseLike<void>,
): Promise<Result<T, E>> {
  const res = (await task).clone();

  await tapFn(res);

  return task;
}

async function zipTask<T, E, T2, E2>(
  task1: Either<T, E>,
  task2: Either<T2, E2>,
): Promise<Result<[T, T2], E | E2>> {
  return (await task1).zip(await task2);
}

async function tripTask<T, E, T2, E2>(
  task: Either<T, E>,
  tripFn: (value: T) => Either<T2, E2>,
): Promise<Result<T, E | E2>> {
  const res = (await task).clone();

  if (res.isErr()) return res;

  const res2 = await tripFn(res.unwrap());

  return res2.and(res);
}

async function riseTask<T, E, T2, E2>(
  task: Either<T, E>,
  riseFn: (value: E) => Either<T2, E2>,
): Promise<Result<T | T2, E>> {
  const res = (await task).clone();

  if (res.isOk()) return res;

  const rhs = await riseFn(res.unwrap());

  return rhs.or(res);
}
