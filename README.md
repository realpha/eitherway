#eitherway

| *Y*et *A*nother *R*ust *I*nspired *O*ption *A*nd *R*esult *I*mplementation
(**YARIOARI**)

##Motivation

The benefits of typesafe error handling and composability, provided are provided
by Rust's `Option<T>` and `Result<T, E>` types have been widely recognized over
the past years. Something functional programmers, have appreciated even longer
via their use of sum types generally and the Either Monad specifically.
Typescript users have since experienced hefty feature greed and immediately
started to roll their own implementations. We _probably_ don't need another
**YARIOARI**. There are [plenty of libraries](#prior-art) available, which have
tried to port these types to Typescript and have done so quite successfully
already. As said, these libraries are splendid for the most part, nevertheless,
when really trying to work with them, it sometimes feels clunky or overly
complex, at best unidiomatic. This is especially true, when working in an async
context. Additionally, anybody who has tried to onboard new team members or
juniors, who are unfamiliar with `Either<L,R>` et al., might have experienced,
how difficult it can be to get used to it. Typescript also has great union type
support. Unfortunately, working with union types requires quite a lot of
boilerplate and defensive programming, which can be abstracted away elegantly by
the use of a monadic interface. Given all the degrees of freedom offered by
Typescript, I believe we still can do a little better, either way.

##Design Goals

`eitherway` is trying to close the gap between typesafety, idiom and
productivity by focusing on the following goals:

- Pragmatism: There is no need to strictly port something from another language
  with very different semantics. Typescript employs structural typing and
  therefore also subtyping, whereas Rust largely employs nominal typing and
  variance only exists in the context of lifetimes. When decisions arrive, which
  call for a trade-off, `eitherway` will always try to offer an solution geared
  towards the constraints and idiom of Typescript.
- Compatibility: Interacting with one of the structures defined by `eitherway`
  should be painless in the sense that things do what you would expect them to
  do in Typescript.
- Documentation: All structures come with full, inline documentation. Making it
  easy to understand what is currently happening and if chosen operation is
  suitable for the desired use case.

##NFRs

On the aspect of quality attributes, `eitherway` strives for:

- Performance: Users should know how much overhead is incurred when using
  `eitherway` and how it compares to other, available libraries in the
  **YARIOARI** category.
- Usability:
- Safety:

##API

###Option

###Result

###Task

##Examples

##Best Practices

##Prior Art

##License & Contributing

###Contributing

###License
