interface IOption<T> {
  isSome: () => boolean;
  isNone: () => boolean;
  map: <U>(mapFn: (arg: T) => NonNullish<U>) => Option<NonNullish<U>>;
  mapOr: <U>(
    mapFn: (arg: T) => NonNullish<U>,
    orValue: NonNullish<U>,
  ) => Option<NonNullish<U>>;
  mapOrElse: <U>(
    mapFn: (arg: T) => NonNullish<U>,
    orFn: () => NonNullish<U>,
  ) => Option<NonNullish<U>>;
  andThen: <U>(thenFn: (arg: T) => Option<U>) => Option<U>;
  unwrap: () => T | undefined;
  unwrapOr: <U>(orValue: NonNullish<U>) => T | NonNullish<U>;
  unwrapOrElse: <U>(orFn: () => NonNullish<U>) => T | NonNullish<U>;
  and: <U>(rhs: Option<U>) => Option<T> | Option<U>;
  or: <U>(rhs: Option<U>) => Option<T> | Option<U>;
  xor: <U>(rhs: Option<U>) => Option<T> | Option<U>;
}

class _None implements IOption<never> {
  constructor() {}

  isSome(): this is Some<never> {
    return false;
  }
  isNone(): this is None {
    return true;
  }
  map<U>(_mapFn: (arg: never) => NonNullish<U>): None {
    return this;
  }
  mapOr<U>(
    _mapFn: (arg: never) => NonNullish<U>,
    orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return Some(orValue);
  }
  mapOrElse<U>(
    _mapFn: (arg: never) => U,
    orFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
    return Some(orFn());
  }
  andThen<U>(_thenFn: (arg: never) => Option<U>): None {
    return this;
  }
  unwrap() {
    return undefined;
  }
  unwrapOr<U>(orValue: NonNullish<U>) {
    return orValue;
  }
  unwrapOrElse<U>(orFn: () => NonNullish<U>) {
    return orFn();
  }
  and<U>(_other: Option<U>): Option<never> {
    return this;
  }
  or<U>(other: Option<U>): Option<U> {
    return other;
  }
  xor<U>(other: Option<U>): Option<U> {
    if (other.isSome()) return other as Option<U>;
    return this as Option<U>;
  }
}

export const None = Object.freeze(new _None());
export type None = typeof None;

class _Some<T> implements IOption<T> {
  #value: T;
  constructor(value: T) {
    this.#value = value;
  }

  isSome(): this is Some<T> {
    return true;
  }
  isNone(): this is None {
    return false;
  }
  map<U>(mapFn: (arg: T) => NonNullish<U>): Option<NonNullish<U>> {
    return Some(mapFn(this.#value));
  }
  mapOr<U>(
    mapFn: (arg: T) => NonNullish<U>,
    _orValue: NonNullish<U>,
  ): Option<NonNullish<U>> {
    return this.map(mapFn);
  }
  mapOrElse<U>(
    mapFn: (arg: T) => NonNullish<U>,
    _orFn: () => NonNullish<U>,
  ): Option<NonNullish<U>> {
    return this.map(mapFn);
  }
  andThen<U>(thenFn: (arg: T) => Option<U>): Option<U> {
    return thenFn(this.#value);
  }
  unwrap(): T {
    return this.#value;
  }
  unwrapOr<U>(_orValue: NonNullish<U>): T {
    return this.#value;
  }
  unwrapOrElse<U>(_orFn: () => NonNullish<U>): T {
    return this.#value;
  }
  and<U>(other: Option<U>): Option<U> {
    return other;
  }
  or<U>(_other: Option<U>): Option<T> {
    return this;
  }
  xor<U>(other: Option<U>): Option<T> {
    if (other.isSome()) return None as Option<T>;
    return this;
  }
}

export type Nullish = null | undefined;
export type NonNullish<T> = Exclude<T, Nullish>;

/**
 * Ref: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
 */
export type Falsy = Nullish | false | "" | 0 | -0 | 0n | -0n;
export type Truthy<T> = Exclude<T, Falsy>;

export type Some<T> = _Some<T>;
export const Some = <T>(value: NonNullish<T>): Some<NonNullish<T>> =>
  new _Some(value);

export type Option<T> = Some<T> | None;

//deno-lint-ignore no-namespace
export namespace Option {
  export function from<T>(value: T): Option<NonNullish<T>> {
    return isNotNullish(value) ? Some(value) : None;
  }
  export function fromFallible<T>(value: T | Error): Option<NonNullish<T>> {
    if (value instanceof Error) return None;
    return Option.from(value);
  }
  export function fromCoercible<T>(value: T): Option<Truthy<T>> {
    return (isTruthy(value) ? Some(value as NonNullish<T>) : None) as Option<
      Truthy<T>
    >;
  }
}

function isNotNullish<T>(arg: T): arg is NonNullish<T> {
  return arg != null;
}
function isTruthy<T>(arg: T): arg is Truthy<T> {
  return Boolean(arg);
}
