import { asInfallible, Err, Ok, Result } from "./mod.ts";

export class Task<T, E> extends Promise<Result<T, E>> {
  private constructor(executor: ExecutorFn<T, E>) {
    super(executor);
  }

  /**
   * =======================
   *    TASK CONSTRUCTORS
   * =======================
   */

  static of<T, E>(
    value: Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    return Task.from(() => value);
  }

  static succeed<T>(value: T): Task<T, never> {
    return new Task((resolve) => resolve(Ok(value)));
  }

  static fail<E>(error: E): Task<never, E> {
    return new Task((resolve) => resolve(Err(error)));
  }

  static from<T, E>(
    fn: () => Result<T, E> | PromiseLike<Result<T, E>>,
  ): Task<T, E> {
    const p = new Promise<Result<T, E>>((resolve) => resolve(fn())).then(
      (res) => res,
    ).catch(asInfallible);
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

  static liftFallible<Args extends unknown[], T, E>(
    fn: (...args: Args) => T | PromiseLike<T>,
    errorMapFn: (reason: unknown) => E,
  ) {
    return function (...args: Args): Task<T, E> {
      const p = new Promise<T>((resolve) => resolve(fn(...args))).then((v) =>
        Ok(v)
      )
        .catch((e) => Err(errorMapFn(e)));
      return new Task<T, E>((resolve) => resolve(p));
    };
  }

  /**
   * ======================
   *  TASK ASYNC OPERATORS
   * ======================
   */

  static id<T, E>() {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return idTask(res);
    };
  }

  static clone<T, E>() {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return cloneTask(res);
    };
  }

  static map<T, T2, E>(mapFn: (v: T) => T2 | PromiseLike<T2>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return mapTaskSuccess(res, mapFn);
    };
  }

  static mapOr<T, T2, E>(
    mapFn: (v: T) => T2 | PromiseLike<T2>,
    orValue: T2 | PromiseLike<T2>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return mapTaskSuccessOr(res, mapFn, orValue);
    };
  }

  static mapOrElse<T, T2, E>(
    mapFn: (v: T) => T2 | PromiseLike<T2>,
    elseFn: (e: E) => T2 | PromiseLike<T2>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return mapTaskSuccessOrElse(res, mapFn, elseFn);
    };
  }

  static mapErr<E, E2, T>(mapFn: (v: E) => E2 | PromiseLike<E2>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return mapTaskFailure(res, mapFn);
    };
  }

  static andThen<T, T2, E, E2>(
    thenFn: (v: T) => Result<T2, E | E2> | PromiseLike<Result<T2, E | E2>>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return chainTaskSuccess(res, thenFn);
    };
  }

  static orElse<E, T2, E2, T>(
    elseFn: (v: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return chainTaskFailure(res, elseFn);
    };
  }

  static zip<T2, E2, T, E>(
    rhs: Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return zipTask(res, rhs);
    };
  }

  static tap<T, E>(tapFn: (v: Result<T, E>) => PromiseLike<void>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return tapTask(res, tapFn);
    };
  }

  static trip<T, T2, E2, E>(
    tripFn: (e: T) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return tripTask(res, tripFn);
    };
  }

  static rise<E, T2, E2, T>(
    riseFn: (e: E) => Result<T2, E2> | PromiseLike<Result<T2, E2>>,
  ) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return riseTask(res, riseFn);
    };
  }

  static unwrap<T, E>() {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return unwrapTask(res);
    };
  }

  static unwrapOr<T, E, T2>(orValue: T2 | PromiseLike<T2>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return unwrapTaskOr(res, orValue);
    };
  }

  static unwrapOrElse<T, E, T2>(elseFn: (e: E) => T2 | PromiseLike<T2>) {
    return function (res: Result<T, E> | PromiseLike<Result<T, E>>) {
      return unwrapTaskOrElse(res, elseFn);
    };
  }

  /**
   * ======================
   * TASK INSTANCE METHODS
   * ======================
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

  tap(tapFn: (v: Result<T, E>) => PromiseLike<void>): Task<T, E> {
    return Task.of(tapTask(this, tapFn));
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
}

/**
 * Helper functions to leverage the same functionality in operators
 * and instance methods
 *
 * @internal
 */

async function idTask<T, E>(task: Either<T, E>): Promise<Result<T, E>> {
  return await task;
}

async function cloneTask<T, E>(task: Either<T, E>): Promise<Result<T, E>> {
  return (await task).clone();
}

async function mapTaskSuccess<T, E, T2>(
  task: Either<T, E>,
  mapFn: (v: T) => T2 | PromiseLike<T2>,
): Promise<Result<T2, E>> {
  const res = await task;
  if (res.isErr()) return res;

  const mapped = await mapFn(res.unwrap());

  return Ok(mapped);
}

async function mapTaskSuccessOr<T, E, T2>(
  task: Either<T, E>,
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  orValue: T2 | PromiseLike<T2>,
): Promise<Result<T2, never>> {
  const res = await task;

  const mapped = res.isErr() ? await orValue : await mapFn(res.unwrap());

  return Ok(mapped);
}

async function mapTaskSuccessOrElse<T, E, T2>(
  task: Either<T, E>,
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  orFn: (e: E) => T2 | PromiseLike<T2>,
): Promise<Result<T2, never>> {
  const res = await task;

  const mapped = res.isErr()
    ? await orFn(res.unwrap())
    : await mapFn(res.unwrap());

  return Ok(mapped);
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
  const res = (await task);

  if (res.isErr()) return res;

  const res2 = await tripFn(res.unwrap());

  return res2.and(res);
}

async function riseTask<T, E, T2, E2>(
  task: Either<T, E>,
  riseFn: (value: E) => Either<T2, E2>,
): Promise<Result<T | T2, E>> {
  const res = (await task);

  if (res.isOk()) return res;

  const rhs = await riseFn(res.unwrap());

  return rhs.or(res);
}

async function unwrapTask<T, E>(task: Either<T, E>): Promise<T | E> {
  return (await task).unwrap();
}

async function unwrapTaskOr<T, E, T2>(
  task: Either<T, E>,
  orValue: T2 | PromiseLike<T2>,
): Promise<T | T2> {
  const res = await task;

  if (res.isOk()) return res.unwrap();
  return orValue;
}

async function unwrapTaskOrElse<T, E, T2>(
  task: Either<T, E>,
  orFn: (e: E) => T2 | PromiseLike<T2>,
): Promise<T | T2> {
  const res = await task;

  if (res.isOk()) return res.unwrap();
  return orFn(res.unwrap());
}

/**
 * These are only used internally to save some chars
 * @interal
 */

type Future<T, E> = PromiseLike<Result<T, E>>;
type Either<T, E> = Result<T, E> | Future<T, E>;
type ExecutorFn<T, E> = ConstructorParameters<typeof Promise<Result<T, E>>>[0];
