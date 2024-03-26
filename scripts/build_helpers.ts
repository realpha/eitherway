import { Option, Result, Task } from "../mod.ts";
import { emptyDir, semver } from "../dev_deps.ts";

export type SemVer = semver.SemVer;
export const ScriptErrors = {
  NoVersionProvided: TypeError("Expected version specifier, received none"),
  CouldNotPrepareDir: (e: unknown) =>
    Error(`Could not prepare directory`, { cause: e }),
  CouldNotCreateFile: (e: unknown) =>
    Error("Could not create file", { cause: e }),
  BuildFailed: (e: unknown) => Error(`Build failed`, { cause: e }),
} as const;

export const tryParse = Result.liftFallible(
  semver.parse,
  (e: unknown) => e as TypeError,
);

/**
 * {@linkcode emptyDir}
 */
export const dirIsEmpty = Task.liftFallible(
  emptyDir,
  ScriptErrors.CouldNotPrepareDir,
);

export function parseVersion(): Result<SemVer, TypeError> {
  return Option.fromCoercible(Deno.args[0])
    .okOr(ScriptErrors.NoVersionProvided)
    .inspect((v) => console.log(`Using version specifier: ${v}`))
    .andThen(tryParse);
}
