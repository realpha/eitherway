import { Err, Ok, Result, Task } from "../mod.ts";
import {
  dirIsEmpty,
  parseVersion,
  ScriptErrors,
  SemVer,
} from "./build_helpers.ts";
import { build, semver } from "../dev_deps.ts";

const PKG_NAME = "eitherway";
const ENTRY_POINT = "./mod.ts";
const OUT_DIR = "./npm";
const LICENSE = "./LICENSE.md";
const README = "./README.md";
const GIT_URL = "git+https://github.com/realpha/eitherway.git";
const ISSUE_URL = "https://github.com/realpha/eitherway/issues";

async function buildPackage(v: SemVer): Promise<Result<void, Error>> {
  try {
    await build({
      entryPoints: [ENTRY_POINT],
      outDir: OUT_DIR,
      typeCheck: "both",
      declaration: "separate",
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
          "error",
          "error-handling",
          "fsharp",
          "fallible",
          "functional",
          "maybe",
          "monad",
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
        Deno.removeSync(`${OUT_DIR}/src`, { recursive: true });
      },
    });
    return Ok(undefined);
  } catch (e: unknown) {
    return Err(ScriptErrors.BuildFailed(e));
  }
}

function main() {
  return parseVersion()
    .into(Task.of<SemVer, TypeError>)
    .andEnsure(() => dirIsEmpty(OUT_DIR))
    .andThen(buildPackage);
}

main().then((res) => {
  const code = res
    .inspect(() => console.log("Build succeeded!"))
    .inspectErr(console.error)
    .mapOr(() => 0, 1)
    .unwrap();

  Deno.exit(code);
});
