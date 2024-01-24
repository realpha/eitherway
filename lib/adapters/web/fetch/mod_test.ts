import { Task } from "../../../async/task.ts";
import {
  assertEquals,
  assertExists,
  assertStrictEquals,
  assertType,
  IsExact,
} from "../../../../dev_deps.ts";
import {
  FetchException,
  isFetchException,
  liftFetchLike,
  ResponseError,
  resultFromResponse,
} from "./mod.ts";

Deno.test("eitherway::adapters::web::fetch", async (t) => {
  await t.step("ResponseError<R>", async (t) => {
    await t.step(".from() -> produces a new generic instance", () => {
      const responseLike = {
        ok: false,
        status: 0,
        statusText: "NetworkError",
      } as const;
      type RL = typeof responseLike;

      const error = ResponseError.from(responseLike);
      type Inner = ReturnType<typeof error.getResponse>;

      assertType<IsExact<Inner, RL>>(true);
      assertStrictEquals(error.name, "ResponseError");
      assertStrictEquals(error.status, responseLike.status);
      assertStrictEquals(error.statusText, responseLike.statusText);
      assertStrictEquals(error.getResponse(), responseLike);
    });

    await t.step(
      ".with() -> produces a new instance with status properties",
      () => {
        const status = 500;
        const statusText = "Internal Server Error";

        const error = ResponseError.with(status, statusText);
        const internalResponse = error.getResponse();

        assertType<IsExact<typeof error, ResponseError<Response>>>(true);
        assertType<IsExact<typeof internalResponse, Response>>(true);
        assertStrictEquals(error.status, internalResponse.status);
        assertStrictEquals(error.statusText, internalResponse.statusText);
      },
    );

    await t.step(".toJSON() -> produces a serializalbe representation", () => {
      const status = 500;
      const statusText = "Internal Server Error";

      const error = ResponseError.with(status, statusText);

      assertStrictEquals(
        JSON.stringify(error),
        JSON.stringify({ status, statusText }),
      );
    });
  });

  await t.step("FetchException", async (t) => {
    await t.step(".from() -> produces new instance", () => {
      const cause = "Something went wrong";
      const expectedCause = Error("Unknown exception", { cause });

      const exception = FetchException.from(cause);

      assertEquals(exception.cause, expectedCause);
      assertStrictEquals(exception.name, "FetchException");
    });

    await t.step("isFetchException() -> narrows to FetchException", () => {
      const exception = FetchException.from("Something went wrong");
      const plainError = Error("Something went wrong");
      const unkwn = "Unknown" as unknown;

      if (isFetchException(unkwn)) {
        assertType<IsExact<typeof unkwn, FetchException>>(true);
      }

      assertStrictEquals(isFetchException(exception), true);
      assertStrictEquals(isFetchException(plainError), false);
      assertStrictEquals(isFetchException(unkwn), false);
      assertStrictEquals(isFetchException(undefined), false);
    });
  });

  await t.step("resultFromResponse", async (t) => {
    await t.step(
      "() -> returns an instance of Err<ResponseError<R>> for non-ok response like inputs",
      () => {
        const errorResponse = Response.error();

        const err = resultFromResponse(errorResponse);
        const unwrapped = err.unwrap();

        assertType<
          IsExact<typeof unwrapped, Response | ResponseError<Response>>
        >(true);
        assertStrictEquals(err.isErr(), true);
        assertEquals(unwrapped, ResponseError.from(errorResponse));
      },
    );

    await t.step(
      "() -> returns an instance of Ok<R> for ok response like inputs",
      () => {
        const response = Response.json({ id: 1 });

        const ok = resultFromResponse(response);
        const unwrapped = ok.unwrap();

        assertType<
          IsExact<typeof unwrapped, Response | ResponseError<Response>>
        >(true);
        assertStrictEquals(ok.isErr(), false);
        assertStrictEquals(unwrapped, response);
      },
    );
  });

  await t.step("liftFetchLike", async (t) => {
    interface User {
      id: number;
    }
    interface GetUserResponse extends Response {
      json(): Promise<User>;
    }
    async function getUser(id: number): Promise<GetUserResponse> {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ id });
    }
    async function getUserNotFound(_id: number): Promise<GetUserResponse> {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(null, { status: 404, statusText: "Not Found" });
    }
    async function failingFetch(_id: number): Promise<GetUserResponse> {
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new Error("Network error");
    }

    await t.step(
      "() -> lifts untyped fetch with default errMapFn and ctor",
      async () => {
        const testUrl = "https://jsonplaceholder.typicode.com/users/1";

        const lifted = liftFetchLike(fetch);
        const result = await lifted(testUrl)
          .trip(() => Task.succeed("Just to test"))
          .inspectErr(console.error)
          .map((response) => response.json());

        assertType<
          IsExact<Parameters<typeof lifted>, Parameters<typeof fetch>>
        >(true);
        assertType<
          IsExact<
            ReturnType<typeof lifted>,
            Task<Response, ResponseError<Response> | FetchException>
          >
        >(true);
        assertStrictEquals(result.isOk(), true);
        assertExists(result.unwrap());
      },
    );

    await t.step(
      "() -> lifts typed fetch with defauft errMapFn and ctor",
      async () => {
        const lifted = liftFetchLike(getUser);

        const result = await lifted(1).map((response) => response.json());

        assertType<
          IsExact<Parameters<typeof lifted>, Parameters<typeof getUser>>
        >(true);
        assertType<
          IsExact<
            ReturnType<typeof lifted>,
            Task<
              GetUserResponse,
              ResponseError<GetUserResponse> | FetchException
            >
          >
        >(true);
        assertStrictEquals(result.isOk(), true);
        assertEquals(result.unwrap(), { id: 1 });
      },
    );
  });
});
