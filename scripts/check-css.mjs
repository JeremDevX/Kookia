import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { auditCss } from "./css-audit.mjs";

const ignoredDirectories = new Set(["node_modules", ".git", "dist", "coverage", ".agents", ".codex"]);

export async function findCssFiles(directory, relative = "") {
  const files = new Map();
  for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      for (const [file, css] of await findCssFiles(directory, name)) files.set(file, css);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".css")) {
      files.set(name, await readFile(path.join(directory, name), "utf8"));
    }
  }
  return files;
}

async function main() {
  const files = await findCssFiles(process.cwd());
  const workshop = new Map([...files].filter(([file]) => file.startsWith("document-workshop/")));
  const application = new Map([...files].filter(([file]) => !file.startsWith("document-workshop/")));
  const issues = [...auditCss(application), ...(workshop.size ? auditCss(workshop, "document-workshop/src/tokens.css") : [])];
  for (const issue of issues) {
    console.error(`${issue.file}:${issue.line}:${issue.column} — ${issue.message}`);
  }
  if (issues.length) {
    console.error(`\n${issues.length} problème(s) CSS. Définir/réutiliser les variables du catalogue de l'application concernée.`);
    process.exitCode = 1;
  } else {
    console.log(`CSS OK — ${files.size} fichiers contrôlés, valeurs visuelles et médias centralisés par application.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Contrôle CSS impossible : ${error.message}`);
    process.exitCode = 1;
  });
}
