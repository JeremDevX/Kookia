import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { auditCss, globalFile } from "./css-audit.mjs";
import { findCssFiles } from "./check-css.mjs";

const globals = `
@custom-media --compact (max-width: 600px);
:root { --space: 16px; --ink: #123; --solid: solid; --zero: 0; }
`;
const audit = (css, catalogue = globals) => auditCss(new Map([
  [globalFile, catalogue], ["src/card.css", css],
]));

test("an independent app uses its own catalogue without weakening literal checks", () => {
  const catalogue = "document-workshop/src/tokens.css";
  const files = new Map([[catalogue, globals], ["document-workshop/src/style.css", ".card { color: var(--ink); }"]]);
  assert.deepEqual(auditCss(files, catalogue), []);
  files.set("document-workshop/src/style.css", ".card { color: #123; }");
  assert.ok(auditCss(files, catalogue).some(issue => issue.message.includes("en dur")));
  files.set("document-workshop/src/style.css", ".card { color: var(--application-only); }");
  assert.ok(auditCss(files, catalogue).some(issue => issue.message.includes("Variable inconnue")));
});

test("accepts global tokens, compositions, CSS-wide keywords and media aliases", () => {
  assert.deepEqual(audit(`
    /* 123px in a comment is not a declaration. */
    .card { padding: var(--space); border: var(--space) var(--solid) var(--ink);
      width: calc((var(--space) + var(--space)) / var(--space)); font: inherit; }
    @media (--compact) { .card { padding: var(--zero); } }
    @keyframes reveal { 50% { opacity: var(--zero); } }
  `), []);
});

test("accepts scoped aliases only inside the global catalogue", () => {
  assert.deepEqual(audit(".card { color: var(--ink); }",
    globals + ".dark { --ink: var(--solid); }"), []);
});

for (const value of [
  "16px", "0", "-1.2rem", "1e2px", "50%", "#fff", "red", "white",
  '"content"', "rgba(0, 0, 0, .5)", "calc(var(--space) + 2px)",
  "var(--space, 12px)", "var(--space, var(--ink, red))",
  "var(--space) /* gap */ 2px", "linear-gradient(var(--ink), blue)",
  'url("/asset.svg")', "env(safe-area-inset-bottom, 12px)",
]) {
  test(`reports literal value ${value}`, () => {
    const issues = audit(`.card { padding: ${value}; }`);
    assert.ok(issues.some((issue) => issue.message.includes("en dur")));
    assert.equal(issues[0].file, "src/card.css");
    assert.equal(issues[0].line, 1);
    assert.equal(issues[0].column, 9);
  });
}

test("allows native structure, but not arbitrary identifiers or undefined animations", () => {
  assert.deepEqual(audit(`
    .card { display: flex; position: relative; width: auto; border-style: solid;
      grid-template-columns: repeat(auto-fit, minmax(var(--space), var(--space)));
      padding: env(safe-area-inset-bottom); animation: reveal var(--zero) ease; }
    @keyframes reveal { from { opacity: var(--zero); } }
  `), []);
  assert.match(audit(".card { animation: missing var(--zero); }")[0].message, /en dur/);
  assert.match(audit(".card { color: reveal; } @keyframes reveal {}")[0].message, /en dur/);
});

test("checks definitions, fallbacks and unknown references, including globals", () => {
  assert.match(audit(".card { --local: var(--space); }")[0].message, /Déplacer/);
  assert.match(audit(".card { color: var(--typo, var(--ink)); }")[0].message, /inconnue/);
  assert.match(audit("", globals + ":root { --alias: var(--typo); }")[0].message, /inconnue/);
  assert.match(audit("", globals + ".card { --local: var(--ink); }")[0].message, /sans définition globale/);
});

test("does not exempt ordinary declarations in index.css", () => {
  assert.match(audit("", globals + ".card { color: red; }")[0].message, /en dur/);
  assert.match(audit("", globals + ".card { --ink: red; }")[0].message, /en dur/);
});

test("reports cycles, duplicate tokens and CSS-wide keywords stored as tokens", () => {
  assert.ok(audit("", globals + ":root { --a: var(--b); --b: var(--a); }")
    .some((issue) => issue.message.includes("Cycle")));
  assert.ok(audit("", globals + ".card { --ink: var(--ink); }")
    .some((issue) => issue.message.includes("Cycle")));
  assert.match(audit("", globals + ":root { --ink: blue; }")[0].message, /dupliquée/);
  assert.match(audit("", globals + ":root { --bad: inherit; }")[0].message, /mot-clé/);
});

test("rejects raw and unknown media, local definitions and conditional imports", () => {
  for (const css of [
    "@media (max-width: 600px) {}", "@media (--typo) {}",
    '@import "./card.css" (max-width: 600px);',
    "@custom-media --local (max-width: 600px);",
    "@supports (width: 12px) {}",
  ]) assert.ok(audit(css).length, css);
  assert.deepEqual(audit('@import "./card.css";'), []);
  assert.match(audit("", globals + "@custom-media --compact (max-width: 400px);")[0].message, /dupliqué/);
});

test("fails on malformed CSS, malformed var(), empty values and a missing catalogue", () => {
  for (const css of [".card {", ".card { color: var(ink); }", ".card { color: var(--ink red); }",
    ".card { color: ; }", ".card { color: rgb(); }"]) {
    assert.ok(audit(css).length, css);
  }
  assert.match(auditCss(new Map())[0].message, /absent/);
});

test("CLI discovers future CSS files outside src and exits nonzero with locations", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kookia-css-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "src/styles"), { recursive: true });
  await mkdir(path.join(directory, "new-feature"));
  await mkdir(path.join(directory, "node_modules"));
  await writeFile(path.join(directory, globalFile), globals);
  await writeFile(path.join(directory, "node_modules/vendor.css"), ".vendor { color: red; }");
  const cli = fileURLToPath(new URL("./check-css.mjs", import.meta.url));
  const run = () => spawnSync(process.execPath, [cli], { cwd: directory, encoding: "utf8" });
  assert.equal(run().status, 0);
  await writeFile(path.join(directory, "new-feature/card.css"), ".card {\n  color: red;\n}");
  const files = await findCssFiles(directory);
  assert.ok(files.has("new-feature/card.css"));
  assert.ok(!files.has("node_modules/vendor.css"));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /new-feature\/card.css:2:3.*en dur/);
});
