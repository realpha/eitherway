interface IOption<T> {
  isSome: () => this is Some<T>;
  isNone: () => this is None;
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
  tap: (tapFn: (arg: Option<T>) => never) => Option<T>;
}

// By declaring an unused, generic type parameter, we get a nicer alias.
class _None<T> implements IOption<never> {
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
  tap(tapFn: (arg: Option<never>) => void) {
    tapFn(None);
    return this;
  }
  get [Symbol.toStringTag]() {
    return "eitherway::Option::None";
  }
  //deno-lint-ignore require-yield 
  *[Symbol.iterator](): IterableIterator<never> {
    return undefined;
  }
  [Symbol.toPrimitive](hint: string) {
    if (hint === "string") return "";
    if (hint === "number") return 0;
    return false;
  }
  toJSON(): undefined {
    return undefined;
  }
  toString(): string {
    return this[Symbol.toPrimitive]("string") as string;
  }
  valueOf(): number {
    return this[Symbol.toPrimitive]("number") as number;
  }
}

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
  map<U>(mapFn: (arg: T) => NonNullish<U>): Some<NonNullish<U>> {
    return Some(mapFn(this.#value));
  }
  mapOr<U>(
    mapFn: (arg: T) => NonNullish<U>,
    _orValue: NonNullish<U>,
  ): Some<NonNullish<U>> {
    return this.map(mapFn);
  }
  mapOrElse<U>(
    mapFn: (arg: T) => NonNullish<U>,
    _orFn: () => NonNullish<U>,
  ): Some<NonNullish<U>> {
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
  tap(tapFn: (arg: Option<T>) => void): Option<T> {
    tapFn(new _Some(this.#value));
    return this;
  }
  get [Symbol.toStringTag]() {
    const innerTag = typeof this.#value === "object"
      ? Object.prototype.toString.call(this.#value)
      : String(this.#value);
    return `eitherway::Option::Some<${innerTag}>`;
  }
  *[Symbol.iterator](
    this: Some<T>,
  ): IterableIterator<T extends Iterable<infer U> ? U : T> {
    const target = Object(this.#value);
    if (Symbol.iterator in target) yield* target;
    return this.#value;
  }
  [Symbol.toPrimitive](hint: string): string | number | boolean | symbol {
    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#primitive_coercion
     */
    if (isPrimitive(this.#value)) return this.#value;

    const target = Object(this.#value);

    if (Symbol.toPrimitive in target) {
      return target[Symbol.toPrimitive](hint);
    }
    return target.toString();
  }
  toJSON(): JsonRepr<T> {
    if (hasToJSON(this.#value)) return this.#value.toJSON() as JsonRepr<T>;
    return this.#value as JsonRepr<T>;
  }
  toString(): ToStringRepr<T> {
    /**
     * At run time this object coercion would happen implicitely anyway for primitive types
     */
    return Object(this.#value).toString();
  }
  valueOf(): ValueRepr<T> {
    /**
     * At run time this object coercion would happen implicitely anyway for primitive types
     */
    return Object(this.#value).valueOf();
  }
}

type HasToJSON<T> = T & { toJSON(): unknown };

function hasToJSON<T>(arg: T): arg is HasToJSON<T> {
  const method = "toJSON";
  const target = Object(arg);
  return method in target && typeof target[method] === "function";
}

function isPrimitive(arg: unknown): arg is string | number | boolean {
  const type = typeof arg;
  return type === "string" || type === "number" || type === "boolean";
}


// type Primitives = string | number | boolean | symbol | bigint | Date;
// type Collections =
//   | Array<unknown>
//   | Set<unknown>
//   | Map<unknown, unknown>
//   | Record<string | number | symbol, unknown>;

type JsonRepr<T> = T extends { toJSON(): infer R } ? R : T;

type ToStringRepr<T> = T extends { toString(): infer R } ? R : never;
type ValueRepr<T> = T extends { valueOf(): infer R } ? R : never;

type Nullish = null | undefined;
/**
 * Ref: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
 */
type Falsy = Nullish | false | "" | 0 | -0 | 0n | -0n;

export type Truthy<T> = Exclude<T, Falsy>;
export type NonNullish<T> = Exclude<T, Nullish>;

function isNotNullish<T>(arg: T): arg is NonNullish<T> {
  return arg != null;
}

function isTruthy<T>(arg: T): arg is Truthy<T> {
  return Boolean(arg);
}

/*
 * Module API
 * By leveraging declaration merging and the fact that types and values
 * live in seperate namespaces, the API feels way more ergonomic
 */

export type Some<T> = _Some<T>;
export function Some<T>(value: NonNullish<T>): Some<NonNullish<T>> {
  return new _Some(value);
}
Object.defineProperty(Some, Symbol.hasInstance, {
  value: <T>(lhs: unknown): lhs is Some<T> => {
    return lhs instanceof _Some;
  },
});
Object.defineProperty(Some, Symbol.toStringTag, {
  value: "eitherway::Option::Some",
});

export type None = _None<never>;
export const None = new _None() as None;
Object.defineProperty(None, Symbol.hasInstance, {
  value: (lhs: unknown): lhs is None => {
    return lhs instanceof _None;
  },
});
Object.defineProperty(None, Symbol.toStringTag, {
  value: "eitherway::Option::None",
});
Object.freeze(None);

export type Option<T> = Some<T> | None;
export function Option<T>(value: T): Option<NonNullish<T>> {
  return isNotNullish(value) ? Some(value) : None;
}
/**
 * Unfortunately TypeScript still doesn't support ECMA standard symbol for type narrowing
 * https://github.com/microsoft/TypeScript/issues/39064
 */
Object.defineProperty(Option, Symbol.hasInstance, {
  value: (lhs: unknown): lhs is Option<unknown> => {
    return lhs instanceof _Some || lhs instanceof _None;
  },
});
Object.defineProperty(Option, Symbol.toStringTag, {
  value: "eitherway::Option",
});

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
    if (isTruthy(value)) return new _Some(value);
    return None;
  }
}
