import { Err, Ok } from "../core/mod.ts";
import type { Result } from "../core/mod.ts";

/**
 * These are only used internally to save some chars
 * @interal
 */

type Future<T, E> = PromiseLike<Result<T, E>>;
type Either<T, E> = Result<T, E> | Future<T, E>;

export type ExecutorFn<T, E> = ConstructorParameters<
  typeof Promise<Result<T, E>>
>[0];

/**
 * @internal
 */
export async function idTask<T, E>(task: Either<T, E>): Promise<Result<T, E>> {
  return await task;
}

/**
 * @internal
 */
export async function cloneTask<T, E>(
  task: Either<T, E>,
): Promise<Result<T, E>> {
  return (await task).clone();
}

/**
 * @internal
 */
export async function mapTaskSuccess<T, E, T2>(
  task: Either<T, E>,
  mapFn: (v: T) => T2 | PromiseLike<T2>,
): Promise<Result<T2, E>> {
  const res = await task;
  if (res.isErr()) return res;

  const mapped = await mapFn(res.unwrap());

  return Ok(mapped);
}

/**
 * @internal
 */
export async function mapTaskSuccessOr<T, E, T2>(
  task: Either<T, E>,
  mapFn: (v: T) => T2 | PromiseLike<T2>,
  orValue: T2 | PromiseLike<T2>,
): Promise<Result<T2, never>> {
  const res = await task;

  const mapped = res.isErr() ? await orValue : await mapFn(res.unwrap());

  return Ok(mapped);
}

/**
 * @internal
 */
export async function mapTaskSuccessOrElse<T, E, T2>(
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

/**
 * @internal
 */
export async function mapTaskFailure<T, E, E2>(
  task: Either<T, E>,
  mapFn: (v: E) => E2 | PromiseLike<E2>,
): Promise<Result<T, E2>> {
  const res = await task;
  if (res.isOk()) return res;

  const mappedErr = await mapFn(res.unwrap());

  return Err(mappedErr);
}

/**
 * @internal
 */
export async function chainTaskSuccess<T, E, T2, E2>(
  task: Either<T, E>,
  thenFn: (v: T) => Either<T2, E2>,
): Promise<Result<T2, E | E2>> {
  const res = await task;
  if (res.isErr()) return res;

  return thenFn(res.unwrap());
}

/**
 * @internal
 */
export async function chainTaskFailure<T, E, T2, E2>(
  task: Either<T, E>,
  elseFn: (v: E) => Either<T2, E2>,
): Promise<Result<T | T2, E2>> {
  const res = await task;
  if (res.isOk()) return res;

  return elseFn(res.unwrap());
}

/**
 * @internal
 */
export async function tapTask<T, E>(
  task: Either<T, E>,
  tapFn: (v: Result<T, E>) => void | PromiseLike<void>,
): Promise<Result<T, E>> {
  const res = (await task).clone();

  await tapFn(res);

  return task;
}

/**
 * @internal
 */
export async function inspectTaskSuccess<T, E>(
  task: Either<T, E>,
  inspectFn: (v: T) => void | PromiseLike<void>,
): Promise<Result<T, E>> {
  const res = await task;

  if (res.isOk()) {
    await inspectFn(res.unwrap());
  }

  return task;
}

/**
 * @internal
 */
export async function inspectTaskFailure<T, E>(
  task: Either<T, E>,
  inspectFn: (v: E) => void | PromiseLike<void>,
): Promise<Result<T, E>> {
  const res = await task;

  if (res.isErr()) {
    await inspectFn(res.unwrap());
  }

  return task;
}

/**
 * @internal
 */
export async function zipTask<T, E, T2, E2>(
  task1: Either<T, E>,
  task2: Either<T2, E2>,
): Promise<Result<[T, T2], E | E2>> {
  return (await task1).zip(await task2);
}

/**
 * @internal
 */
export async function andEnsureTask<T, E, T2, E2>(
  task: Either<T, E>,
  ensureFn: (value: T) => Either<T2, E2>,
): Promise<Result<T, E | E2>> {
  const original = await task;

  if (original.isErr()) return original;

  const res = await ensureFn(original.unwrap());

  return res.and(original);
}

/**
 * @internal
 */
export async function orEnsureTask<T, E, T2, E2>(
  task: Either<T, E>,
  ensureFn: (value: E) => Either<T2, E2>,
): Promise<Result<T | T2, E>> {
  const original = await task;

  if (original.isOk()) return original;

  const res = await ensureFn(original.unwrap());

  return res.or(original);
}

/**
 * @internal
 */
export async function unwrapTask<T, E>(task: Either<T, E>): Promise<T | E> {
  return (await task).unwrap();
}

/**
 * @internal
 */
export async function unwrapTaskOr<T, E, T2>(
  task: Either<T, E>,
  orValue: T2 | PromiseLike<T2>,
): Promise<T | T2> {
  const res = await task;

  if (res.isOk()) return res.unwrap();
  return orValue;
}

/**
 * @internal
 */
export async function unwrapTaskOrElse<T, E, T2>(
  task: Either<T, E>,
  orFn: (e: E) => T2 | PromiseLike<T2>,
): Promise<T | T2> {
  const res = await task;

  if (res.isOk()) return res.unwrap();
  return orFn(res.unwrap());
}

/**
 * @internal
 */
export async function* iterTask<T, E>(
  task: Either<T, E>,
): AsyncIterableIterator<T> {
  const res = await task;

  if (res.isErr()) return;

  yield res.unwrap();
}
