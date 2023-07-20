import type {
  JsonRepr,
  NonNullish,
  StringRepr,
  Truthy,
  ValueRepr,
} from "./type_utils.ts";
import {
  hasToJSON,
  isNotNullish,
  isPrimitive,
  isTruthy,
} from "./type_utils.ts";

/**
 * ==============
 * BASE INTERFACE
 * ==============
 */

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
  toJSON: () => JsonRepr<T>;
  toString: () => StringRepr<T>;
  valueOf: () => ValueRepr<T>;
  toTag: () => string;
  [Symbol.toStringTag]: string;
  [Symbol.toPrimitive](hint: string): string | number | boolean | symbol;
  [Symbol.iterator](): IterableIterator<T extends Iterable<infer U> ? U : T>;
}

/**
 * ==============
 * IMPLEMENTATION 
 * ==============
 */

// By declaring an unused, generic type parameter, we get a nicer alias.
class _None<T = never> implements IOption<never> {
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
  and<U>(_rhs: Option<U>): None {
    return this;
  }
  or<U>(rhs: Option<U>): Some<U> | None {
    return rhs;
  }
  xor<U>(rhs: Option<U>): Some<U> | None {
    if (rhs.isSome()) return rhs;
    return this;
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
    /**
     * This is actually what we want, since returning from a generator implies
     * that it's exhausted, i.e. { done: true, value: undefined }
     */
    return undefined;
  }
  [Symbol.toPrimitive](hint: string): string | number | boolean | symbol {
    if (hint === "string") return "";
    if (hint === "number") return 0;
    return false;
  }
  toJSON(): JsonRepr<never> {
    return undefined;
  }
  toString(): StringRepr<never> {
    return "";
  }
  valueOf(): ValueRepr<never> {
    return 0;
  }
  toTag(): string {
    return Object.prototype.toString.call(this);
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
  and<U>(rhs: Option<U>): Some<U> | None {
    return rhs;
  }
  or<U>(_rhs: Option<U>): Some<T> {
    return this;
  }
  xor<U>(rhs: Option<U>): Some<T> | None {
    if (rhs.isSome()) return None;
    return this;
  }
  tap(tapFn: (arg: Option<T>) => void): Option<T> {
    tapFn(new _Some(structuredClone(this.#value)));
    return this;
  }
  get [Symbol.toStringTag]() {
    const innerTag = typeof this.#value === "object"
      ? Object.prototype.toString.call(this.#value)
      : String(this.#value);
    return `eitherway::Option::Some<${innerTag}>`;
  }
  *[Symbol.iterator](): IterableIterator<T extends Iterable<infer U> ? U : T> {
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
    if (hasToJSON(this.#value)) return this.#value.toJSON();
    /**
     * This cast is necessary, because we need to retain the possibility of
     * T being never for the corresponding method on None. We know that
     * T != never for Some<T> though
     */
    return this.#value as JsonRepr<T>;
  }
  toString(): StringRepr<T> {
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
  toTag(): string {
    return Object.prototype.toString.call(this);
  }
}

/*
 * ==============
 *   MODULE API
 * ==============
 * By leveraging declaration merging and the fact that types and values
 * live in seperate namespaces, the API feels way more ergonomic
 */

//deno-lint-ignore-lines no-namespace


export type Some<T> = _Some<T>;

/**
 *
 * *Some<T> Factory*
 * Some<T> represents the encapsulation of a value of type T.
 *
 * @example
 * ```typescript
 * const str = "thing";
 * const some = Some(str);
 *
 * assert(some instanceof Some === true);
 * assert(some.isSome() === true);
 * assert(some.isNone() === false);
 * assert(some.unwrap() === str);
 * ```
 *
 */
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
/**
 *
 * *None*
 * None represents the absence of a value.
 *
 * @example
 * ```typescript
 * const none = None;
 *
 * //TS Bug: https://github.com/microsoft/TypeScript/issues/39064
 * assert(none instanceof (None as any) === true);
 * assert(none.isNone() === true);
 * assert(none.isSome() === false);
 * assert(none.unwrap() === undefined);
 * ```
 *
 */
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

/**
 *
 * *Option<T> Factory* 
 * Option<T> represents:
 *  - EITHER the encapsulation of a value of type T via Some<T>
 *  - OR the absence of a value via None
 *
 * @example
 * ```typescript
 * const str: string | undefined = "thing";
 * const undef: string | undefined = undefined;
 *
 * const some: Option<string> = Option(str);
 * const none: Option<string> = Option(undef);
 *
 * assert(some instanceof Option === true);
 * asserr(none instanceof Option === true);
 * assert(some.isSome() === true);
 * assert(none.isNone() === true);
 * ```
 */
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
