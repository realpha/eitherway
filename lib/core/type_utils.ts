import type { Option, Some } from "./option.ts";
/**
 * ===============
 *      TYPES
 * ===============
 */

/**
 * Representation of how type T will be passed on to searialization to
 * `JSON.stringify()`
 *
 * The square brackets are used to prevent distribution over unions where
 * never is erased anyway and we can actuall match never, which is
 * necessary for None
 *
 * Reference:
 * https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
export type JsonRepr<T> = [T] extends { toJSON(): infer R } ? R
  : [T] extends [never] ? undefined
  : T;

/**
 * String representation of type T, i.e. the return type of <T>.toString()
 */
export type StringRepr<T> = [T] extends { toString(): infer R } ? R
  : [T] extends [never] ? string
  : unknown;

/**
 * Value representation of type T, i.e. the return type of <T>.valueOf()
 */
export type ValueRepr<T> = [T] extends { valueOf(): infer R } ? R
  : [T] extends [never] ? number
  : unknown;

export type Nullish = null | undefined;
/**
 * Ref: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
 */
export type Falsy = Nullish | false | "" | 0 | -0 | 0n;
export type Fallible<E> = E extends Error ? E : never;

export type Truthy<T> = Exclude<T, Falsy>;
export type NonNullish<T> = Exclude<T, Nullish>;
export type Infallible<T> = Exclude<T, Nullish | Fallible<T>>;
export type HasToJSON<T> = T extends { toJSON(): JsonRepr<T> } ? T : never;

export type IsOption<O> = O extends Option<unknown> ? true : false;
export type OptionType<O> = O extends Option<infer Inner> ? Inner : never;
export type SomeType<S extends Option<unknown>> = S extends Some<infer Inner>
  ? Inner
  : never;
export type NonReadonly<T> = T extends Readonly<infer U> ? U : T;

export type Empty = Readonly<Record<"never", never>>;
export const EMPTY: Empty = Object.freeze(Object.create(null));

/**
 * ===============
 * TYPE PREDICATES
 * ===============
 */

export function isNotNullish<T>(arg: T): arg is NonNullish<T> {
  return arg != null;
}

export function isTruthy<T>(arg: T): arg is Truthy<T> {
  return Boolean(arg);
}

export function isInfallible<T>(arg: T): arg is Infallible<T> {
  if (arg == null || arg instanceof Error) return false;
  return true;
}

export function hasToJSON<T>(arg: T): arg is HasToJSON<T> {
  const method = "toJSON";
  const target = Object(arg);
  return method in target && typeof target[method] === "function";
}

export function isPrimitive(arg: unknown): arg is string | number | boolean {
  const type = typeof arg;
  return type === "string" || type === "number" || type === "boolean";
}

/**
 * ===============
 *   DECORATORS
 * ===============
 */

/**
 * Waiting for this to simplify module structure
 * https://github.com/denoland/deno/issues/19160
 */
export function callable<
  //deno-lint-ignore no-explicit-any
  T extends new (...args: any[]) => any,
  Ctx extends ClassDecoratorContext<T>,
  R = InstanceType<T>,
>(
  ctor: T,
  ctx: Ctx,
) {
  if (ctx.kind !== "class") return;
  return function (...args: ConstructorParameters<T>): R {
    return new ctor(...args);
  };
}
