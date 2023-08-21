# eitherway

| *Y*et *A*nother *R*ust *I*nspired *O*ption *A*nd *R*esult *I*mplementation
(**YARIOARI**)

## Design Goals

`eitherway` is trying to close the gap between type-safety, idiom and
productivity by focusing on the following goals:

- _Pragmatism_: There is no need to strictly port something from another
  language with very different semantics. Typescript employs structural typing
  and therefore also sub-typing, whereas Rust largely employs nominal typing and
  variance only exists in the context of lifetimes. When decisions arrive, which
  call for a trade-off, `eitherway` will always try to offer an solution geared
  towards the constraints and idiom of Typescript.
- _Compatibility_: Interacting with one of the structures defined by `eitherway`
  should be painless in the sense that things do what you would expect them to
  do in Typescript.
- _Documentation_: All structures come with full, inline documentation. Making
  it easy to understand what is currently happening and if the chosen operation
  is suitable for the desired use case. (Soon(TM))

## Motivation

Let's be honest: The community already nurtured a bunch of great projects,
providing similar abstractions. The goal has always been to make it easier and
more explicit to handle error cases under the
["errors are values" premise](https://www.youtube.com/watch?v=PAAkCSZUG1c&t=16m13s).
After having worked with quite a few of these existing abstractions, a couple of
issues arose/persisted:

- _Overly strict_: Some of the existing implementations don't account for the
  variance emerging naturally in a structural type system.
- _Onboarding is hard_: Most of the existing projects provide either very little
  or scattered documentation. Forcing new users to constantly switch context in
  order to understand how they can achieve their goal or if their chosen
  operation is suitable for their use case.
- _Lack of async support_: Very few existing projects offer abstractions for
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

### Chance<T> (in progress)

### Task<T, E>

## Best Practices

## FAQ

<details>
  <summary><b>Q: Why should I even use something like this?</b></summary>
  *A: It's nice. Really.*

If you prefer video, here are two gems for you! Old but gold:

- ["Railway-oriented programming" by Scott Wlaschin](https://vimeo.com/113707214)
- ["Boundaries" by Gary Bernhardt](https://www.destroyallsoftware.com/talks/boundaries)

</details>

<details>
  <summary><b>Q: Why can't I use Task<T, E> or Chance<T> as the return type of an async function?</b></summary>
  *A: That's a general restriction of JavaScript.*

A function marked as async, can and always will only return a `Promise`.
Although `Task<T, E>` and `Chance<T>` are (currently) proper subclasses of
`Promise`, they cannot be used in the Return Type Position of an async function,
because they are _NOT_ system promises (for lack of a better word).

That's hardly an issue though, as `Task<T, E>` and `Chance<T>` just are
composability extensions for `Promise<Result<T, E>>` and `Promise<Option<T>>`
respectively. You can use `<Task/Chance>.of()` or the promise operators defined
as static methods to compose your pipeline.

See
[here](https://stackoverflow.com/questions/74451272/how-can-i-use-async-await-with-a-promise-subclass)

</details>

<details>
  <summary><b>Q: Why subclassing Promises instead of just providing a PromiseLike abstraction?</b></summary>
  *A: For compatibility reasons.*

The drawback of the current implementation is that we cannot make `Task<T, E>`
or `Chance<T>` lazy. On the other hand, a lot of framework or library code is
still (probably needlessly) invariant over `PromiseLike` types, therefore taking
the subclass route and allowing the users to treat `Promise<Result<T, E>>` and
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
