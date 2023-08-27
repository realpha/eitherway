# eitherway

| **Y**et **A**nother **O**ption and **R**esult **I**mplementation (**YAORI**)

Safe abstractions for fallible flows.

## Design Goals

`eitherway` is trying to close the gap between type-safety, idiom and
productivity by focusing on the following goals:

- **Pragmatism**: There is no need to strictly port something from another
  language with very different semantics. Typescript employs structural typing
  and therefore also sub-typing, whereas Rust largely employs nominal typing and
  variance only exists in the context of lifetimes. When decisions arrive, which
  call for a trade-off, `eitherway` will always try to offer a solution geared
  towards the constraints and idiom of Typescript.
- **Compatibility**: Interacting with one of the structures defined by
  `eitherway` should be painless in the sense that things do what you would
  expect them to do in Typescript and are compatible with inherent language
  protocols.
- **Documentation**: All structures come with full, inline documentation. Making
  it easy to understand what is currently happening and if the chosen operation
  is suitable for the desired use case. (Soon(TM))

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

The goal here is really to make the abstractions provided by `eitherway` the
most safe, productive and overall enjoyable to work with. Irrespective of
experience or employed context.

## `eitherway` in Action

### Installation

### Getting started

## API

### Option<T>

### Result<T, E>

### Task<T, E>

## Best Practices

## FAQ

<details>
  <summary><b>Q: Why should I even use something like this?</b></summary>
  <b>A: It's nice. Really.</b>

Explicit error types and built-in happy/error path selectors lead to expressive
code which is often even more pleasant to read.

Compare these examples, taken from the benchmark suite:
```typescript
/**
 * ==================
 *    SYNCHRONOUS 
 * ==================
 */

/* Classic exception style */
function processString(input: string | undefined): number {
  try {
    const upperCased = toUpperCase(input);
    const length = stringToLength(upperCased);
    return powerOfSelf(length);
  } catch (error: unknown) {
    if(error instanceof TypeError) {
      console.error(error.message);
      throw error;
    }
    throw new TypeError("Unknown error", {cause: error});
  }
}

/* With Result */ 
function processString(input: string | undefined): Result<number, TypeError> {
  return toUpperCase(input)
    .andThen(stringToLength)
    .andThen(powerOfSelf)
    .inspectErr(e => console.error(e.message));
}


/**
 * ==================
 *    ASYNCHRONOUS 
 * ==================
 */

/* Classic exception style */
async function processString(input: string | undefined): Promise<number> {
  try {
    const upperCased = await toUpperCase(input);
    const length = await stringToLength(upperCased);
    return await powerOfSelf(length);
  } catch (error: unknown) {
    if(error instanceof TypeError) {
      console.error(error.message);
      throw error;
    }
    throw new TypeError("Unknown error", {cause: error});
  }
}

/* Equivalent Task flow */
function processString(input: string | undefined): Task<number, TypeError> {
  return toUpperCase(input)
    .andThen(stringToLength)
    .andThen(powerOfSelf)
    .inspectErr(e => console.error(e.message));
}
```

Apart from making error cases explicit, the abstractions provided here foster 
a code style, which naturally builds up complex computations via composition of
small, focused functions/methods, where boundaries are defined by values.
Thus leading to a highly maintainable and easily testable code base.

Even better: These abstractions come with practically no overhead (see the next
section).

Here are a couple of videos, explaining the general benefits in more detail:

- ["Railway-oriented programming" by Scott Wlaschin](https://vimeo.com/113707214)
- ["Boundaries" by Gary Bernhardt](https://www.destroyallsoftware.com/talks/boundaries)

Bonus: If you are curious how this can help you with structuring applications,
here is another gem:

- ["Functional Core - Imperative Shell" by Gary Bernhardt](https://www.destroyallsoftware.com/talks/functional-core-imperative-shell)

</details>

<details>
  <summary><b>Q: What is the performance impact of using this?</b></summary>
  <b>A: Practically none.</b>

Here the results for synchronous exception propagation vs. result passing:
```markdown
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz
runtime: deno 1.33.2 (x86_64-apple-darwin)

file:///projects/eitherway/bench/sync_bench.ts
benchmark         time (avg)        (min … max)        p75      p99     p995
--------------------------------------------------------------------------------
SyncExceptions  29.15 µs/iter  (20.54 µs … 472 µs)    31.34 µs 38.22 µs 49.28 µs
SyncResultFlow  15.49 µs/iter  (11.07 µs … 441.17 µs) 15.44 µs 31.69 µs 43.37 µs

summary
  SyncResultFlow
   1.88x faster than SyncExceptions
```

In an asynchronous context:
```markdown
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz
runtime: deno 1.33.2 (x86_64-apple-darwin)

file:///projects/eitherway/bench/async_bench.ts
benchmark             time (avg)       (min … max)       p75       p99      p995
----------------------------------------------------------------------------------
AsyncExceptions     24.78 ms/iter (22.08 ms … 25.55 ms) 25.46 ms 25.55 ms 25.55 ms
TaskInstanceFlow    23.88 ms/iter (21.28 ms … 25.8 ms)  24.57 ms 25.8 ms  25.8 ms
TaskOperatorFlow    24.21 ms/iter (21.33 ms … 25.73 ms) 25.36 ms 25.73 ms 25.73 ms
TaskEarlyReturnFlow 24.04 ms/iter (20.36 ms … 25.47 ms) 25.42 ms 25.47 ms 25.47 ms

summary
  TaskInstanceFlow
   1.01x faster than TaskEarlyReturnFlow
   1.01x faster than TaskOperatorFlow
   1.04x faster than AsyncExceptions
```

These results suggest, that for nearly all practical considerations there is no
or virtually no overhead of using the abstractions provided by `eitherway` vs.
a classic exception propagation style.
Although the result and task flows were slightly faster in the runs above, it's
important not to fall into a micro-optimization trap. The conclusion should not
necessarily be "use eitherway, it's faster", but rather "use eitherway, it's 
practically free".

You can run these yourself with `$ deno bench`






</details>

<details>
  <summary><b>Q: Why can't I use Task<T, E> as the return type of an async function?</b></summary>
  <b>A: That's a general restriction of JavaScript.</b>

A function defined with the `async` keyword, must return a "system" `Promise`.
Although `Task<T, E>` (currently) is a proper subclass of `Promise`, 
it cannot be used in the Return Type Position of an async function,
because it's _NOT_ a "system" promise (for lack of a better word).

Since `Task<T, E>` is a subclass of `Promise<Result<T, E>>`, it's possible to
return it as such from an async function though or just await it.

Furthermore, `Task<T, E>` is merely composability extensions for `Promise<Result<T, E>>`.
As such, you can cheaply convert every `Promise<Result<T, E>` via the `Task.of()` constructor, 
or use the promise operators to compose your pipeline.

</details>

<details>
  <summary><b>Q: Why subclassing Promises instead of just providing a PromiseLike abstraction?</b></summary>
  <b>A: For compatibility reasons.</b>

The drawback of the current implementation is that we cannot make `Task<T, E>`
or `Chance<T>` lazy.
On the other hand, a lot of framework or library code is still (probably 
needlessly) invariant over `PromiseLike` types. Therefore subclassing the
native `Promise` and allowing the users to treat `Promise<Result<T, E>>` and
`Task<T, E>` interchangeably in most situations, was the preferred solution.

</details>

## Prior Art

## License & Contributing

### Contributing

### License

<sup>
Licensed under either of <a href="LICENSE-APACHE">Apache License, Version
2.0</a> or <a href="LICENSE-MIT">MIT license</a> at your option.
</sup>

<br>

<sub>
Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in `eitherway` by you, as defined in the Apache-2.0 license, shall be
dual licensed as above, without any additional terms or conditions.
</sub>
