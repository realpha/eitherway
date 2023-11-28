//deno-lint-ignore-file
import { Task } from "../lib/async/task.ts";
import { Err, Ok } from "../lib/core/result.ts";
import { Option } from "../lib/core/option.ts";

Deno.bench({
  name: "Promise.resolve(Ok)",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Promise.resolve(Ok("foo"));
  },
});

Deno.bench({
  name: "Task.succeed",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Task.succeed("foo");
  },
});

Deno.bench({
  name: "Promise.resolve(Err)",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Promise.resolve(Err(Error("foo")));
  },
});

Deno.bench({
  name: "Task.fail",
  group: "Micro::Async::Instantiation",
  fn: () => {
    const res = Task.fail(Error("foo"));
  },
});

Deno.bench({
  name: "Ok",
  group: "Micro::Instantiation",
  fn: () => {
    const res = Ok("foo");
  },
});

Deno.bench({
  name: "Err",
  group: "Micro::Instantiation",
  fn: () => {
    const res = Err("foo");
  },
});

Deno.bench({
  name: "Option",
  group: "Micro::Instantiation",
  fn: () => {
    const res = Option("foo");
  },
});

