import { Err, Ok, Option, Result, Task } from "../mod.ts";
import { build, emptyDir, semver } from "../dev_deps.ts";

type SemVer = semver.SemVer;

const PKG_NAME = "eitherway";
const ENTRY_POINT = "./mod.ts";
const OUT_DIR = "./npm";
const LICENSE = "./LICENSE.md";
const README = "./README.md";
const GIT_URL = "git+https://github.com/realpha/eitherway.git";
const ISSUE_URL = "https://github.com/realpha/eitherway/issues";

const ScriptErrors = {
  NoVersionProvided: TypeError("Expected version specifier, received none"),
  CouldNotCreateOutputDir: (e: unknown) =>
    Error(`Could not create output directory`, { cause: e }),
  BuildFailed: (e: unknown) => Error(`Build failed`, { cause: e }),
} as const;

const tryParse = Result.liftFallible(
  semver.parse,
  (e: unknown) => e as TypeError,
);
const createOutputDir = Task.liftFallible(
  emptyDir,
  ScriptErrors.CouldNotCreateOutputDir,
);

function parseVersion(): Result<SemVer, TypeError> {
  return Option.fromCoercible(Deno.args[0])
    .okOr(ScriptErrors.NoVersionProvided)
    .inspect((v) => console.log(`Using version specifier: ${v}`))
    .andThen(tryParse);
}

async function buildPackage(v: SemVer): Promise<Result<void, Error>> {
  try {
    await build({
      entryPoints: [ENTRY_POINT],
      outDir: OUT_DIR,
      typeCheck: "both",
      test: false,
      shims: {
        deno: false,
      },
      package: {
        name: PKG_NAME,
        version: semver.format(v),
        description:
          "Safe abstractions for fallible flows inspired by F# and Rust",
        license: "MIT",
        author: "realpha <0xrealpha@proton.me>",
        engines: {
          "node": ">=17.0.0", //needed for structuredClone
        },
        repository: {
          type: "git",
          url: GIT_URL,
        },
        bugs: {
          url: ISSUE_URL,
        },
        keywords: [
          "async",
          "either",
          "fsharp",
          "fallible",
          "maybe",
          "option",
          "result",
          "rust",
          "task",
          "typescript",
        ],
      },
      compilerOptions: {
        lib: ["DOM", "ES2022"], //needed for structuredClone
        target: "ES2022",
      },
      postBuild() {
        Deno.copyFileSync(LICENSE, `${OUT_DIR}/LICENSE.md`);
        Deno.copyFileSync(README, `${OUT_DIR}/README.md`);
      },
    });
    return Ok(undefined);
  } catch (e: unknown) {
    return Err(ScriptErrors.BuildFailed(e));
  }
}

function main() {
  return parseVersion()
    .into((res) => Task.of(res))
    .trip((_v) => createOutputDir(OUT_DIR))
    .andThen(buildPackage);
}

main().then((res) => {
  if (res.isErr()) {
    console.error(res.unwrap());
    Deno.exit(1);
  }
  console.log("Build succeeded!");
  Deno.exit(0);
});
