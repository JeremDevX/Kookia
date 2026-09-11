import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import postcss from "postcss";
import { globalMediaPlugin, readMediaDefinitions } from "./css-media.mjs";

test("compiles global media in place and tracks catalogue edits for HMR", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kookia-css-media-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "index.css");
  await writeFile(file, "@custom-media --compact (max-width: 600px);");
  const process = (css) => postcss([globalMediaPlugin(file)]).process(css, { from: "card.css" });
  const input = ".a { color: var(--ink); } @media (--compact) { .a { display: var(--hidden); } } .b {}";
  const result = await process(input);
  assert.equal(result.css, input.replace("(--compact)", "(max-width: 600px)"));
  assert.ok(result.messages.some((message) => message.type === "dependency" && message.file === file));
  await writeFile(file, "@custom-media --compact (max-width: 480px);");
  assert.match((await process(input)).css, /max-width: 480px/);
  await assert.rejects(() => process("@media (--unknown) {}"), /inconnue/);
  await assert.rejects(() => process("@media (max-width: 12px) {}"), /non centralisée/);
  assert.equal((await process("@custom-media --compact (max-width: 480px);")).css, "");
});

test("rejects duplicate, nested and malformed definitions", () => {
  for (const source of [
    "@custom-media --compact;",
    "@custom-media --compact (max-width: 600px) {}",
    ".card { @custom-media --compact (max-width: 600px); }",
    "@custom-media --compact (--other);",
    "@custom-media --compact (max-width: var(--size));",
    "@custom-media --compact (max-width: 1px); @custom-media --compact (max-width: 2px);",
  ]) assert.throws(() => readMediaDefinitions(postcss.parse(source)), undefined, source);
});
