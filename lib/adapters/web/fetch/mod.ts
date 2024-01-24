import { Task } from "../../../async/task.ts";
import { Err, Ok, Result } from "../../../core/result.ts";

export interface ResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
}

export interface ResponseErrorJson {
  status: number;
  statusText: string;
}

export class ResponseError<R extends ResponseLike> extends Error {
  name = "ResponseError";
  status: number;
  statusText: string;
  #response: R;
  constructor(res: R) {
    super(res.statusText);
    this.#response = res;
    this.status = res.status;
    this.statusText = res.statusText;
  }

  static from<R extends ResponseLike>(res: R): ResponseError<R> {
    return new ResponseError(res);
  }

  static with(status: number, statusText: string): ResponseError<Response> {
    return new ResponseError<Response>(
      new Response(null, { status, statusText }),
    );
  }

  getResponse(): R {
    return this.#response;
  }

  toJSON(): ResponseErrorJson {
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
    super("Fetch failed");
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

export function resultFromResponse<R extends ResponseLike>(
  res: R,
): Result<R, ResponseError<R>> {
  if (res.ok) return Ok(res);
  return Err(ResponseError.from(res));
}

export function liftFetchLike<
  Args extends unknown[],
  R extends ResponseLike,
  E1 = FetchException,
  T = R,
  E2 = ResponseError<R>,
>(
  fetchLike: (...args: Args) => R | PromiseLike<R>,
  errMapFn?: (cause: unknown) => E1,
  ctor?: (arg: R) => Result<T, E2>,
): (...args: Args) => Task<T, E2 | E1> {
  return Task.liftFallible<Args, R, E2 | E1, T>(
    fetchLike,
    (errMapFn ?? FetchException.from) as (cause: unknown) => E1,
    (ctor ?? resultFromResponse<R>) as (arg: R) => Result<T, E2>,
  );
}
