# eitherway

| *Y*et *A*nother *R*ust *I*nspired *O*ption *A*nd *R*esult *I*mplementation 
(**YARIOARI**)

## Design Goals

`eitherway` is trying to close the gap between type-safety, idiom and
productivity by focusing on the following goals:

- *Pragmatism*: There is no need to strictly port something from another language
  with very different semantics. Typescript employs structural typing and
  therefore also sub-typing, whereas Rust largely employs nominal typing and
  variance only exists in the context of lifetimes. When decisions arrive, which
  call for a trade-off, `eitherway` will always try to offer an solution geared
  towards the constraints and idiom of Typescript.
- *Compatibility*: Interacting with one of the structures defined by `eitherway`
  should be painless in the sense that things do what you would expect them to
  do in Typescript.
- *Documentation*: All structures come with full, inline documentation. Making it
  easy to understand what is currently happening and if chosen operation is
  suitable for the desired use case.

## Examples

## API

### Option<T>

### Result<T, E>

### Chance<T>

### Task<T, E>

## Best Practices

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
