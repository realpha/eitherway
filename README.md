# eitherway

[![maintainability](https://api.codeclimate.com/v1/badges/dc2d6e0d46d4b6b304f6/maintainability)](https://codeclimate.com/github/realpha/eitherway/maintainability)
![ci](https://github.com/realpha/eitherway/actions/workflows/ci.yml/badge.svg)
[![coverage](https://api.codeclimate.com/v1/badges/dc2d6e0d46d4b6b304f6/test_coverage)](https://codeclimate.com/github/realpha/eitherway/test_coverage)
[![deno](https://shield.deno.dev/x/eitherway)](https://deno.land/x/eitherway)
[![npm](https://img.shields.io/npm/v/eitherway)](https://www.npmjs.com/package/eitherway)
![release](https://github.com/realpha/eitherway/actions/workflows/release.yml/badge.svg)

> Yet Another Option and Result Implementation (**YAORI**)

Safe abstractions for fallible flows inspired by F# and Rust.

## Disclaimer

🚧 This project is still under development, expect some breaking changes 🚧

Please see this [tracking issue](https://github.com/realpha/eitherway/issues/9)
for more information regarding when to expect a stable release.

## Contents

- [Motivation](#motivation)
- [Design Goals](#design-goals)
- [`eitherway` in Action](#eitherway-in-action)
  - [Installation](#installation)
- [API](#api)
  - [Overview](#overview)
    - [Design Decisions](#design-decisions)
    - [Additions](#additions)
  - [Option](#option)
  - [Result](#result)
  - [Task](#task)
- [Best Practices](#best-practices)
- [FAQ](#faq)
- [Prior Art](#prior-art)
- [License and Contributing](#license-and-contributing)

## Motivation

Let's be honest: The community already nurtured a bunch of great projects,
providing similar abstractions. The goal has always been to make it easier and
more explicit to handle error cases under the
["errors are values" premise](https://www.youtube.com/watch?v=PAAkCSZUG1c&t=16m13s).
After having worked with quite a few of these existing abstractions, a couple of
issues arose/persisted:

- **Overly strict**: Some of the existing implementations don't account for the
  variance emerging naturally in a structural type system.
- **Onboarding is hard**: Most of the existing projects provide either very
  little or scattered documentation. Forcing new users to constantly switch
  context in order to understand how they can achieve their goal or if their
  chosen operation is suitable for their use case.
- **Lack of async support**: Very few existing projects offer abstractions for
  working in an `async` context, none of them really being first class citizens.

The goal here really is to make the abstractions provided by `eitherway` the
most safe, productive and overall enjoyable to work with. Irrespective of
experience or employed context.

## Design Goals

`eitherway` is trying to close the gap between type-safety, idiom and
productivity by focusing on the following goals:

- **Pragmatism**: There is no need to strictly port something from another
  language with very different semantics. When decisions arrive, which call for
  a trade-off, `eitherway` will always try to offer a solution geared towards
  the constraints and idiom of Typescript.
- **Compatibility**: Interacting with one of the structures defined by
  `eitherway` should be painless in the sense that things do what you would
  expect them to do in Typescript and are compatible with inherent language
  protocols (e.g. Iterator protocol).
- **Safety**: Once an abstraction is instantiated, no inherent operation should
  ever panic.
- **Performance**: All abstractions provided here should strive to amortize the
  cost of usage and be upfront about these costs.
- **Documentation**: All structures come with full, inline documentation. Making
  it easy to understand what is currently happening and if the chosen operation
  is suitable for the desired use case. (Still very much in progress)

## `eitherway` in Action

```typescript
import { Option, Result, Task } from "https://deno.land/x/eitherway/mod.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A little API over-use to show what's possible.
 * This is not the most efficient way to write code, but still performs well
 * enough in benchmarks.
 */

function toUpperCase(input: string | undefined): Task<string, TypeError> {
  return Option(input) // All nullish values are None
    .okOrElse(() => TypeError("Input is undefined")) // Convert to Result<string, TypeError>
    .into((res) => Task.of(res)) // Push the result into an async context
    .map(async (str) => {
      await sleep(1);
      return str.toUpperCase();
    });
}

function stringToLength(input: string): Task<number, TypeError> {
  return Option.fromCoercible(input) // All falsy types are None
    .okOrElse(() => TypeError("Input string is empty"))
    .into((res) => Task.of(res))
    .map(async (str) => {
      await sleep(1);
      return str.length;
    });
}

function powerOfSelf(input: number): Task<number, TypeError> {
  return Option.fromCoercible(input)
    .okOrElse(() =>
      TypeError("Cannot perform computation with NaN, Infinity or 0")
    )
    .into((res) => Task.of(res))
    .andThen(async (n) => { // Promise<Result<T, E>> and Task<T, E> can be used interchangeably for async composition
      await sleep(1);
      return Option.fromCoercible(Math.pow(n, n))
        .okOrElse(() => TypeError("Cannot calculate result"));
    });
}

function processString(input: string | undefined): Task<number, TypeError> {
  return toUpperCase(input) // Synchronous and asynchronous composition work the same
    .andThen(stringToLength)
    .andThen(powerOfSelf);
}

async function main(): Promise<Result<number, TypeError>> {
  const result = await processString("foo"); // Task is of course awaitable

  return Task.of(result); // You can return Task<T, E> as Promise<Result<T, E>>
}

main()
  .then((result) => {
    result // Result<number, TypeError>
      .inspect(console.log)
      .inspectErr(console.error);
  })
  .catch((e) => "Unreachable!")
  .finally(() => console.log("DONE!"));
```

### Installation

#### Minimum Required Runtime Versions

`eitherway` internally uses the
[`Error.cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause#browser_compatibility)
configuration option and
[`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone),
therefore please make sure these versions are met:

- `deno`: >=1.14.
- `node`: >=17.0.0
- `Browser`: [`Error.cause`](https://caniuse.com/?search=Error.cause) &
  [`structuredClone`](https://caniuse.com/?search=structuredClone)

| <img width="30px" height="30px" alt="Deno" src="https://res.cloudinary.com/dz3vsv9pg/image/upload/v1620998361/logos/deno.svg"></br>deno | <img width="24px" height="24px" alt="Node.js" src="https://res.cloudinary.com/dz3vsv9pg/image/upload/v1620998361/logos/nodejs.svg"></br>node | <img width="24px" height="24px" alt="IE / Edge" src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png"></br>Edge | <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" /></br>Chrome | <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" /></br>Firefox | <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" /></br>Safari |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `>=1.14.0`                                                                                                                              | `>=17.0.0`                                                                                                                                   | `>=119`                                                                                                                                              | `>=119`                                                                                                                                                   | `>=119`                                                                                                                                                       | `>=17.1`                                                                                                                                                  |

#### `deno`

```typescript
import {
  Err,
  None,
  Ok,
  Option,
  Result,
  Some,
  Task,
} from "https://deno.land/x/eitherway/mod.ts";
```

#### `node`

```bash
(npm | pnpm | yarn) add eitherway
```

`esm`:

```typescript
import { Err, None, Ok, Option, Result, Some, Task } from "npm:eitherway";
```

`cjs`:

```javascript
const { Err, Ok, Option, None, Result, Some, Task } = require("eitherway");
```

## API

### Overview

On a high level, `eitherway` provides 3 basic abstractions, which have different
use cases:

- [`Option<T>`](#option): Composable equivalent of the union `T | undefined`.
  Use this to handle the case of non-existence gracefully or assert a certain
  fact about a value.
- [`Result<T, E>`](#result): Composable equivalent of the union `T | E`. Use
  this to gracefully handle an happy-path and error-path without the need to
  throw exceptions.
- [`Task<T, E>`](#task): Composable equivalent of `Promise<T | E>`. Same as
  `Result` but for asynchronous operations.

#### Design Decisions

If you are coming from other languages, or other libraries, you will be familiar
with most parts already. A couple of things are handled differently though:

- **Thinking in unions**: Union types are ubiquitous and a powerful feature of
  Typescript. The abstractions provided by `eitherway` were modeled to provide a
  tag to members of unions commonly used. As a consequence, there are no `safe`
  or `unchecked` variants for methods like `.unwrap()`.

```typescript
import { Ok, Option, Result } from "https://deno.land/x/eitherway/mod.ts";

const opt: Option<string> = Option("foo");
const res: Result<number, TypeError> = Ok(1);

// Without narrowing, the union type is returned
const maybeString: string | undefined = opt.unwrap();
const numOrError: number | TypeError = res.unwrap();

// The type can easily be narrowed though
if (res.isErr()) {
  console.error(res.unwrap());
}

const num: number = res.unwrap();
```

- **Upholding basic invariants**: You CANNOT construct an instance of
  `Option<undefined | null>` and you MUST NOT throw exceptions when returning
  `Result<T, E>` or `Task<T, E>` from a function.
- **Don't panic**: Following the previous statements, `eitherway` does not throw
  or re-throw exceptions under normal operations. In fact, there are only 3
  scenarios, which lead to a panic at runtime:
  1. Trying to shove a nullish value into `Some`. The compiler will not allow
     this, but if you perform a couple of type casts, or a library you depend on
     provides wrong type declarations, the `Some` constructor will throw an
     exception, when you end up trying to instantiate it with a nullish value.
  2. Trying to lift a `Promise` or a function, which you've explicitly provided
     as infallible, into a `Result` or `Task` context and it ends up panicking.
  3. You, despite being told multiple times not to do so, chose to panic in a
     function you've implicitly marked as infallible by returning a
     `Result<T, E>`, a `Promise<Result<T, E>>` or a `Task<T, E>`.
- **Closure of operations**: All mapping and chaining operations are closed,
  meaning that they return an instance of the same abstraction as the one they
  were called on.

#### Additions

Some notable additions, which you may have been missing in other libraries:

- **Composable side-effects**: `.tap()`, `.inspect()` and `.inspectErr()`
  methods.
- **Pass-through conditionals**: `.andEnsure()` & `.orEnsure()` methods.
- **Sync & Async feature parity**: `Result<T, E>` and `Task<T, E>` provide the
  same API for composing operations. Only the predicates `.isOk()` and
  `.isErr()` are not implemented on `Task<T, E>` (for obvious reasons).
- **Composability helpers**: Higher order `.lift()` and `.liftFallible()`
  functions. Eliminating the need to manually wrap library or existing code in
  many situations.
- **Collection helpers**: Exposed via the namespaces `Options`, `Results` and
  `Tasks`, every abstraction provides functions to collect tuples, arrays and
  iterables into the base abstraction.

### Option

1. [Overview and factories](https://deno.land/x/eitherway/mod.ts?s=Option)
2. [Base interface](https://deno.land/x/eitherway/mod.ts?s=IOption) implemented
   by `Some<T>` and `None`
3. [Collection helpers](https://deno.land/x/eitherway/mod.ts?s=Options)

### Result

1. [Overview and factories](https://deno.land/x/eitherway/mod.ts?s=Result)
2. [Base interface](https://deno.land/x/eitherway/mod.ts?s=IResult) implemented
   by `Ok<T>` and `Err<E>`
3. [Collection helpers](https://deno.land/x/eitherway/mod.ts?s=Results)

### Task

1. [Overview and factories](https://deno.land/x/eitherway/mod.ts?s=Task)
2. [Collection helpers](https://deno.land/x/eitherway/mod.ts?s=Tasks)

## Best Practices

1. **Computations - not data**: The abstractions provided by `eitherway` are
   meant to represent the results of computations, not data.
2. **Embrace immutability**: Don't mutate your state. That's it.
3. **Return early occasionally**: When building up longer pipelines of
   operations, especially if they involve synchronous and asynchronous
   operations, you may want to break out of a pipeline to not enqueue
   micro-tasks needlessly. The need to do this, does arise less frequently than
   one might think though.
4. **Unwrap at the edges**: Most application frameworks and library consumers
   expect that any errors are propagated through exceptions (and hopefully
   documented). Therefore, it's advised to unwrap `Option`s, `Result`s and
   `Task`s at the outer most layer of your code. In a simple CRUD application,
   this might be an error handling interceptor, a controller, or the
   implementation of your public API in case of a library.
5. **Some errors are unrecoverable**: In certain situations the "errors are
   values" premise falls short on practicality.
   [burntsushi](https://blog.burntsushi.net/unwrap/),
   [Rob Pike](https://go.dev/doc/effective_go#errors) and many others have
   already written extensively about this. When encountering a truly
   unrecoverable error or an impossible state, throwing a runtime exception is a
   perfectly valid solution.
6. **Discriminate but don't over-accumulate**: It's often very tempting, to just
   accumulate possible errors as a discriminated union when building out flows
   via composition of `Result` and `Task` pipelines and let the user or the next
   component in line figure out what to do next. This only works up to a certain
   point. Errors are important domain objects, and they should be modeled
   accordingly.
7. **Lift others up to help yourself out**: Use the
   [composability helpers](https://deno.land/x/eitherway/mod.ts?s=Result.liftFallible).
   They really reduce noise and speed up integrating external code a lot.

```typescript
import { Option, Result } from "https://deno.land/x/eitherway/mod.ts";
import * as semver from "https://deno.land/std@0.206.0/semver/mod.ts";

const noInputProvidedError = Error("No input provided");
const toParseError = (e: unknown) =>
  TypeError("Could not parse version", { cause: e });

const tryParse = Result.liftFallible(
  semver.parse,
  toParseError,
);

const version = Option.from(Deno.args[0])
  .okOr(noInputProvidedError)
  .andThen(tryParse);
```

## FAQ

<details>
  <summary><b>Q: Why should I even use something like this?</b></summary>
  <b>A: It's nice. Really.</b>

Explicit error types and built-in happy/error path selectors lead to expressive
code which is often even more pleasant to read.

<details>
    <summary>Compare these examples, taken from the benchmark suite:</summary>

Synchronous:

```typescript
/* Classic exception style */

declare function toUpperCase(input: string | undefined): string;
declare function stringToLength(input: string): number;
declare function powerOfSelf(input: number): number;

function processString(input: string | undefined): number {
  try {
    const upperCased = toUpperCase(input);
    const length = stringToLength(upperCased);
    return powerOfSelf(length);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      console.error(error.message);
      throw error;
    }
    throw new TypeError("Unknown error", { cause: error });
  }
}
```

```typescript
/* Equivalent Result flow */

import { Result } from "https://deno.land/x/eitherway/mod.ts";

declare function toUpperCase(
  input: string | undefined,
): Result<string, TypeError>;
declare function stringToLength(input: string): Result<number, TypeError>;
declare function powerOfSelf(input: number): Result<number, TypeError>;

function processString(input: string | undefined): Result<number, TypeError> {
  return toUpperCase(input)
    .andThen(stringToLength)
    .andThen(powerOfSelf)
    .inspectErr((e) => console.error(e.message));
}
```

Asynchronous:

```typescript
/* Classic exception style */

declare function toUpperCase(input: string | undefined): Promise<string>;
declare function stringToLength(input: string): Promise<number>;
declare function powerOfSelf(input: number): Promise<number>;

async function processString(input: string | undefined): Promise<number> {
  try {
    const upperCased = await toUpperCase(input);
    const length = await stringToLength(upperCased);
    return await powerOfSelf(length);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      console.error(error.message);
      throw error;
    }
    throw new TypeError("Unknown error", { cause: error });
  }
}
```

```typescript
/* Equivalent Task flow */

import { Result, Task } from "https://deno.land/x/eitherway/mod.ts";

declare function toUpperCase(
  input: string | undefined,
): Task<string, TypeError>;
declare function stringToLength(
  input: string,
): Promise<Result<number, TypeError>>;
declare function powerOfSelf(input: number): Task<number, TypeError>;

function processString(input: string | undefined): Task<number, TypeError> {
  return toUpperCase(input)
    .andThen(stringToLength)
    .andThen(powerOfSelf)
    .inspectErr((e) => console.error(e.message));
}
```

</details>

Apart from making error cases explicit, the abstractions provided here foster a
code style, which naturally builds up complex computations via composition of
small, focused functions/methods, where boundaries are defined by values. Thus
leading to a highly maintainable and easily testable code base.

Even better: These abstractions come with practically no overhead (see the next
section).

Here are a couple of videos, explaining the general benefits in more detail:

- ["Railway-oriented programming" by Scott Wlaschin](https://vimeo.com/113707214)
- ["Boundaries" by Gary Bernhardt](https://www.destroyallsoftware.com/talks/boundaries)

</details>

<details>
  <summary><b>Q: What is the performance impact of using this?</b></summary>
  <b>A: Practically none.</b>

You can run the benchmark suite yourself with `$ deno bench`.

The benchmark results suggest, that for nearly all practical considerations
there is no or virtually no overhead of using the abstractions provided by
`eitherway` vs. a classic exception propagation style.

Although the result and task flows were slightly faster in the runs below, it's
important not to fall into a micro-optimization trap. The conclusion should not
necessarily be "use eitherway, it's faster", but rather "use eitherway, it's
practically free".

The overall performance thesis is that by returning errors instead of throwing,
catching and re-throwing exceptions, the instantiation costs of the abstractions
provided here are amortized over call-stack depth & it's size, as well as the
optimizations the linear return path allows, sometimes even leading to small
performance improvements. This sounds plausible, and the results are not
refuting the null hypothesis here, but benchmarking is hard and for most use
cases, the difference really won't matter.

<details>
    <summary>Synchronous exception propagation vs. result chaining</summary>

```markdown
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz runtime: deno 1.33.2
(x86_64-apple-darwin)

## file:///projects/eitherway/bench/sync_bench.ts benchmark time (avg) (min … max) p75 p99 p995

SyncExceptions 29.15 µs/iter (20.54 µs … 472 µs) 31.34 µs 38.22 µs 49.28 µs
SyncResultFlow 15.49 µs/iter (11.07 µs … 441.17 µs) 15.44 µs 31.69 µs 43.37 µs

summary SyncResultFlow 1.88x faster than SyncExceptions
```

</details>

<details>
    <summary>Asynchronous exception propagation vs. task chaining</summary>

```markdown
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz runtime: deno 1.33.2
(x86_64-apple-darwin)

## file:///projects/eitherway/bench/async_bench.ts benchmark time (avg) (min … max) p75 p99 p995

AsyncExceptions 24.78 ms/iter (22.08 ms … 25.55 ms) 25.46 ms 25.55ms 25.55ms
TaskInstanceFlow 23.88 ms/iter (21.28 ms … 25.8 ms) 24.57 ms 25.8ms 25.8ms
TaskOperatorFlow 24.21 ms/iter (21.33 ms … 25.73 ms) 25.36 ms 25.73ms 25.73ms
TaskEarlyReturnFlow 24.04 ms/iter (20.36 ms … 25.47 ms) 25.42 ms 25.47ms 25.47ms

summary TaskInstanceFlow 1.01x faster than TaskEarlyReturnFlow 1.01x faster than
TaskOperatorFlow 1.04x faster than AsyncExceptions
```

</details>

<details>
    <summary>Micro benchmarks</summary>
If you have a highly performance sensitive use case, you should be using
a different language.
On a more serious note, also small costs can add up and as a user, you should
know how high the costs are. So here are a few micro benchmarks:

```markdown
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz runtime: deno 1.33.2
(x86_64-apple-darwin)

## file:///projects/eitherway/bench/micro_bench.ts benchmark time (avg) (min … max) p75 p99 p995

Promise.resolve(Ok) 44.33 ns/iter (35.81 ns … 106.41 ns) 44.6 ns 62.58 ns
72.56ns Task.succeed 105.43 ns/iter (88.44 ns … 227.26 ns) 108.97 ns 204.75 ns
212.54ns Promise.resolve(Err) 3.11 µs/iter (3.06 µs … 3.27 µs) 3.13 µs 3.27 µs
3.27 µs Task.fail 2.94 µs/iter (2.71 µs … 3.35 µs) 3.25 µs 3.35 µs 3.35 µs

summary Promise.resolve(Ok) 2.38x faster than Task.succeed 66.41x faster than
Task.fail 70.14x faster than Promise.resolve(Err)

## file:///projects/eitherway/bench/micro_bench.ts benchmark time (avg) (min … max) p75 p99 p995

Ok 5.1 ns/iter (4.91 ns … 22.27 ns) 5.02 ns 8.62 ns 11.67 ns Err 4.88 ns/iter
(4.7 ns … 17.93 ns) 4.81 ns 8.18 ns 10.52 ns Option 90.39 ns/iter (83.63 ns …
172.61 ns) 93.31 ns 135.19 ns 146.79 ns

summary Err 1.05x faster than Ok 18.52x faster than Option

## file:///projects/eitherway/bench/micro_bench.ts benchmark time (avg) (min … max) p75 p99 p995

Async Exception Propagation 9.08 µs/iter (8.95 µs … 9.26 µs) 9.18 µs 9.26 µs
9.26 µs Async Error Propagation 6.32 µs/iter (6.24 µs … 6.52 µs) 6.37 µs 6.52 µs
6.52 µs

summary Async Error Propagation 1.44x faster than Async Exception Propagation
```

</details>
</details>

<details>
  <summary><b>Q: Why can't I use Task<T, E> as the return type of an async function?</b></summary>
  <b>A: That's a general restriction of JavaScript.</b>

A function defined with the `async` keyword, must return a "system" `Promise`.
Although `Task<T, E>` (currently) is a proper subclass of `Promise`, it cannot
be used in the Return Type Position of an async function, because it's _NOT_ a
"system" promise (for lack of a better word).

Since `Task<T, E>` is a subclass of `Promise<Result<T, E>>`, it's possible to
return it as such from an async function though or just await it.

```typescript
import { Result, Task } from "https://deno.land/x/eitherway/mod.ts";

async function toTask(str: string): Promise<Result<string, never>> {
  return Task.succeed(str);
}
```

Furthermore, `Task<T, E>` is merely a composability extension for
`Promise<Result<T, E>>`. As such, you can cheaply convert every
`Promise<Result<T, E>` via the `Task.of()` constructor, or use the promise
operators to compose your pipeline.

</details>

<details>
  <summary><b>Q: Why subclassing Promises instead of just providing a PromiseLike abstraction?</b></summary>
  <b>A: For compatibility reasons.</b>

The drawback of the current implementation is that we cannot evaluate
`Task<T, E>` lazily. On the other hand, a lot of framework or library code is
still (probably needlessly) invariant over `PromiseLike` types. Therefore
subclassing the native `Promise` and allowing the users to treat
`Promise<Result<T, E>>` and `Task<T, E>` interchangeably in most situations, was
the preferred solution.

</details>

## Prior Art

- [neverthrow](https://github.com/supermacro/neverthrow)
- [ts-result](https://github.com/vultix/ts-results)
- [oxide.ts](https://github.com/traverse1984/oxide.ts)
- [eventual-result](https://github.com/alexlafroscia/eventual-result)

## License and Contributing

### Contributing

<p>Please see <a href="CONTRIBUTING.md">CONTRIBUTING</a> for more information.</p>

### License

<p>Licensed under <a href="LICENSE.md">MIT license</a>.</p>
