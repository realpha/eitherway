interface IOption<T> {
  isSome: () => boolean;
  isNone: () => boolean;
  map: <U>(mapFn: (arg: T) => U) => Option<U>;
  mapOr: <U>(mapFn: (arg: T) => U, orValue: U) => Option<U>;
  mapOrElse: <U>(mapFn: (arg: T) => U, orFn: () => U) => Option<U>;
  andThen: <U>(thenFn: (arg: T) => Option<U>) => Option<U>;
  unwrap: () => T | undefined;
  unwrapOr: <U>(orValue: U) => T | U;
  unwrapOrElse: <U>(orFn: () => U) => T | U;
  and: <U>(rhs: Option<U>) => Option<T|U>;
  or: <U>(rhs: Option<U>) => Option<T|U>;
  xor: <U>(rhs: Option<U>) => Option<T|U>;
}

class _None implements IOption<never> {
  constructor(){}

  isSome(): this is Some<never> {
    return false;
  }
  isNone(): this is None {
    return true;
  }
  map<T, U>(_mapFn: (arg: T) => U): None {
    return this;
  }
  mapOr<U>(_mapFn: (arg: never) => U, orValue: U): Option<U> {
    return Option.from(orValue);
  }
  mapOrElse<U>(_mapFn: (arg: never) => U, orFn: () => U): Option<U> {
    return Option.from(orFn());
  }
  andThen<T, U>(_thenFn: (arg: T) => Option<U>): None {
    return this;
  }
  unwrap() {
    return undefined;
  }
  unwrapOr<U>(orValue: U) {
    return orValue;
  }
  unwrapOrElse<U>(orFn: () => U) {
    return orFn();
  }
  and<U>(_other: Option<U>): None {
    return this;
  }
  or<U>(other: Option<U>): Option<U> {
    return other;
  }
  xor<U>(other: Option<U>): Option<U> {
    if (other.isSome()) return other;
    return this;
  }
}

export type None = _None;
export const None = Object.freeze(new _None());

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
  map<U>(mapFn: (arg: T) => U): Some<U> {
    return new _Some(mapFn(this.#value));
  }
  mapOr<U>(mapFn: (arg: T) => U, _orValue: U): Some<U> {
    return this.map(mapFn);
  }
  mapOrElse<U>(mapFn: (arg: T) => U, _orFn: () => U): Some<U> {
    return this.map(mapFn);
  }
  andThen<U>(thenFn: (arg: T) => Option<U>): Option<U> {
    return thenFn(this.#value);
  }
  and<U>(other: Option<U>): Option<U> {
    return other;
  }
  or<U>(_other: Option<U>): Some<T> {
    return this;
  }
  xor<U>(other: Option<U>): Option<T> {
    if (other.isSome()) return None;
    return this;
  }
  unwrap(): T {
    return this.#value;
  }
  unwrapOr<U>(_orValue: U): T {
    return this.#value;
  }
  unwrapOrElse<U>(_orFn: () => U): T {
    return this.#value;
  }
}

export type Nullish = null | undefined
export type NonNullish<T> = Exclude<T, Nullish>

/**
 * Ref: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
 */
export type Falsy = Nullish | false | "" | 0 | -0 | 0n | -0n;
export type Truthy<T> = Exclude<T, Falsy>


export type Some<T> = _Some<T>;
export const Some = <T>(value: NonNullish<T>) => new _Some(value);

export type Option<T> = Some<T> | None;

//deno-lint-ignore no-namespace
export namespace Option {
  export function from<T>(value: T): Option<NonNullish<T>> {
    return isNotNullish(value) ? Some(value) : None;
  }
  export function fromFallable<T>(value: T | Error): Option<NonNullish<T>> {
    if (value instanceof Error) return None;
    return Option.from(value);
  }
  export function fromFalsy<T>(value: T): Option<Truthy<T>> {
    return (isTruthy(value) ? Some(value as NonNullish<T>) : None) as Option<Truthy<T>>;
  }
}

function isNotNullish<T>(arg: T): arg is NonNullish<T> {
  return arg != null;
}
function isTruthy<T>(arg: T): arg is Truthy<T> {
  return Boolean(arg);
}
