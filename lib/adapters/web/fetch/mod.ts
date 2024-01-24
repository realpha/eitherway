import { Task } from "../../../async/task.ts";
import { Err, Ok, Result } from "../../../core/result.ts";

export interface ResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
}

export interface FailedRequestJson {
  status: number;
  statusText: string;
}

export class FailedRequest<R extends ResponseLike> extends Error {
  name = "FailedRequest";
  status: number;
  statusText: string;
  #response: R;
  constructor(res: R) {
    super(res.statusText);
    this.#response = res;
    this.status = res.status;
    this.statusText = res.statusText;
  }

  static from<R extends ResponseLike>(res: R): FailedRequest<R> {
    return new FailedRequest(res);
  }

  static with(status: number, statusText: string): FailedRequest<Response> {
    return new FailedRequest<Response>(
      new Response(null, { status, statusText }),
    );
  }

  getResponse(): R {
    return this.#response;
  }

  toJSON(): FailedRequestJson {
    return {
      status: this.status,
      statusText: this.statusText,
    };
  }
}

export class FetchException extends Error {
  name = "FetchException";
  cause: Error | TypeError;
  constructor(cause: unknown) {
    super("Fetch paniced - operation aborted.");
    this.cause = cause instanceof Error
      ? cause
      : Error("Unknown exception", { cause });
  }

  static from(cause: unknown): FetchException {
    return new FetchException(cause);
  }
}

export function isFetchException(err: unknown): err is FetchException {
  return err != null && typeof err === "object" &&
    err.constructor === FetchException;
}

export function toFetchResult<R extends ResponseLike>(
  res: R,
): Result<R, FailedRequest<R>> {
  if (res.ok) return Ok(res);
  return Err(FailedRequest.from(res));
}

/**
 * Use this to lift a fetch-like function into a Task context.
 *
 * This is a constrained wrapper over `Task.liftFallible` and comes with a default
 * `ctorFn` and `errMapFn` for the 2nd and 3rd parameter respectively.
 *
 * @param fetchLike - Function to lift. Any function returning a `ResponseLike` object.
 * @param ctorFn - Result or Task constructor function. Use this to distinguish successful from failed requests.
 * @param errMapFn - Error map function. Maps any exception to a known error.
 *
 * @category Adapters
 *
 * @example Basic Usage
 * ```typescript
 * import { liftFetch } from "./mod.ts";
 *
 * interface Company {
 *   name: string;
 * }
 *
 * interface User {
 *   id: number;
 *   company: Company;
 * }
 *
 * const lifted = liftFetch(fetch);
 * const resourceUrl = "https://jsonplaceholder.typicode.com/users/1";
 *
 * const result: Company = await lifted(resourceUrl)
 *   .map(async (resp) => (await resp.json()) as User) // Lazy, use validation!
 *   .inspect(console.log)
 *   .inspectErr(console.error) // FailedRequest<Response> | FetchException
 *   .mapOr(user => user.company, { name: "Acme Corp." })
 *   .unwrap();
 * ```
 *
 * @example With custom Response type
 * ```typescript
 * import { liftFetch } from "./mod.ts";
 *
 * interface Company {
 *   name: string;
 * }
 *
 * interface User {
 *   id: number;
 *   company: Company;
 * }
 *
 * interface UserResponse extends Response {
 *   json(): Promise<User>
 * }
 *
 * function fetchUserById(id: number): Promise<UserResponse> {
 *   return fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
 * }
 *
 * const lifted = liftFetch(fetchUserById);
 *
 * const result: Company = await lifted(1)
 *   .map((resp) => resp.json()) // inferred as User
 *   .inspect(console.log)
 *   .inspectErr(console.error) // FailedRequest<UserResponse> | FetchException
 *   .mapOr(user => user.company, { name: "Acme Corp." })
 *   .unwrap();
 * ```
 */
export function liftFetch<
  Args extends unknown[],
  R extends ResponseLike,
  T = R,
  E1 = FailedRequest<R>,
  E2 = FetchException,
>(
  fetchLike: (...args: Args) => R | PromiseLike<R>,
  ctorFn?: (arg: R) => Result<T, E1> | PromiseLike<Result<T, E1>>,
  errMapFn?: (cause: unknown) => E2,
): (...args: Args) => Task<T, E1 | E2> {
  return Task.liftFallible<Args, R, E1 | E2, T>(
    fetchLike,
    (errMapFn ?? FetchException.from) as (cause: unknown) => E2,
    (ctorFn ?? toFetchResult<R>) as (arg: R) => Result<T, E1>,
  );
}
