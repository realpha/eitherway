import { Err, Ok, Option, Result, Task } from "../mod.ts";
import { dnt, semver } from "../dev_deps.ts";

type SemVer = semver.SemVer;

const PKG_NAME = "eitherway";
const ENTRY_POINT = "../mod.ts";
const OUT_DIR = "../npm";
const LICENSE = "../LICENSE.md";
const README = "../README.md";
const GIT_URL = "git+https://github.com/realpha/eitherway.git";
const ISSUE_URL = "https://github.com/realpha/eitherway/issues";

const ScriptErrors = {
  NoVersionProvided: TypeError("Expected version specifier, received none"),
  CouldNotCreateOutputDir: (e: any) =>
    Error(`Could not create output directory`, { cause: e }),
  BuildFailed: (e: any) => Error(`Build failed`, { cause: e }),
} as const;

const tryParse = Result.liftFallible(
  semver.parse,
  (e: unknown) => e as TypeError,
);
const createOutputDir = Task.liftFallible(
  dnt.emptyDir,
  ScriptErrors.CouldNotCreateOutputDir,
);

function parseVersion(): Result<SemVer, TypeError> {
  return Option.from(Deno.args[0]).okOr(ScriptErrors.NoVersionProvided).andThen(
    tryParse,
  );
}

async function buildPackage(v: SemVer): Promise<Result<void, Error>> {
  try {
    await dnt.build({
      entryPoints: [ENTRY_POINT],
      outDir: OUT_DIR,
      shims: {
        deno: true,
      },
      package: {
        name: PKG_NAME,
        version: v.build.join("."),
        description: "Yet another Result and Option implementation",
        license: "MIT",
        repository: {
          type: "git",
          url: GIT_URL,
        },
        bugs: {
          url: ISSUE_URL,
        },
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

function main(): Task<void, Error> {
  return parseVersion()
    .into((res) => Task.of(res))
    .trip((_v) => createOutputDir(OUT_DIR))
    .andThen(buildPackage);
}

await main().inspectErr(console.error);
