import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { cssWideKeywords, inspectValue } from "./css-values.mjs";
import { mediaAlias, readMediaDefinitions } from "./css-media.mjs";

export const globalFile = "src/styles/index.css";

export function auditCss(files) {
  const issues = [];
  const roots = new Map();
  const report = (file, node, message) => {
    issues.push({ file, line: node?.source?.start?.line ?? 1,
      column: node?.source?.start?.column ?? 1, message });
  };
  for (const [file, source] of files) {
    try {
      roots.set(file, postcss.parse(source, { from: file }));
    } catch (error) {
      issues.push({ file, line: error.line ?? 1, column: error.column ?? 1,
        message: error.reason ?? error.message });
    }
  }
  const globals = roots.get(globalFile);
  if (!globals) {
    report(globalFile, null, "Catalogue global absent ou invalide.");
    return issues;
  }
  const definitions = new Map();
  globals.walkDecls(/^--/, (decl) => {
    if (decl.parent.type !== "rule" || decl.parent.selector !== ":root" || decl.parent.parent !== globals) return;
    if (definitions.has(decl.prop)) report(globalFile, decl, `Variable globale dupliquée : ${decl.prop}`);
    definitions.set(decl.prop, decl);
  });
  let media = new Map();
  try {
    media = readMediaDefinitions(globals);
  } catch (error) {
    issues.push({ file: globalFile, line: error.line ?? 1, column: error.column ?? 1, message: error.reason });
  }

  const dependencies = new Map([...definitions.keys()].map((name) => [name, new Set()]));
  for (const [file, root] of roots) {
    root.walkDecls((decl) => {
      const custom = decl.prop.startsWith("--");
      const globalDefinition = file === globalFile && definitions.get(decl.prop) === decl;
      if (custom && file !== globalFile) {
        report(file, decl, `Déplacer la définition ${decl.prop} dans ${globalFile}.`);
      } else if (custom && !definitions.has(decl.prop)) {
        report(file, decl, `Variable sans définition globale : ${decl.prop}`);
      }
      const { references, literals, errors } = inspectValue(decl.value);
      for (const error of errors) report(file, decl, error);
      if (globalDefinition && cssWideKeywords.has(decl.value.trim().toLowerCase())) {
        report(file, decl, "Un mot-clé CSS global doit rester sur la déclaration, pas dans une variable.");
      }
      for (const name of references) {
        if (!definitions.has(name)) report(file, decl, `Variable inconnue : ${name}`);
        if (custom && file === globalFile) dependencies.get(decl.prop)?.add(name);
      }
      if (!globalDefinition && literals.length) {
        report(file, decl, `${decl.prop} : valeur(s) en dur ${[...new Set(literals)].join(", ")}`);
      } else if (!globalDefinition && !references.size && !cssWideKeywords.has(decl.value.trim().toLowerCase())) {
        report(file, decl, `${decl.prop} : utiliser une valeur globale avec var().`);
      }
    });
    root.walkAtRules((rule) => {
      if (rule.name === "custom-media") {
        if (file !== globalFile) report(file, rule, `Déplacer @custom-media dans ${globalFile}.`);
      } else if (rule.name === "media") {
        const alias = mediaAlias(rule.params);
        if (!alias || !media.has(alias)) report(file, rule, `Condition média non globale ou inconnue : ${rule.params}`);
      } else if (rule.name === "import") {
        const args = valueParser(rule.params).nodes.filter((node) => !["space", "comment"].includes(node.type));
        if (args.length !== 1 || !(args[0].type === "string" || (args[0].type === "function" && args[0].value === "url"))) {
          report(file, rule, "@import doit contenir uniquement un chemin ; utiliser un alias @media pour les conditions.");
        }
      } else if (!["keyframes", "-webkit-keyframes", "layer"].includes(rule.name)) {
        report(file, rule, `Règle @${rule.name} non prise en charge par le contrôle ; centraliser sa configuration avant usage.`);
      }
    });
  }

  const visited = new Set();
  function visit(name, chain) {
    if (chain.includes(name)) {
      report(globalFile, definitions.get(name), `Cycle de variables : ${[...chain, name].join(" → ")}`);
      return;
    }
    if (visited.has(name)) return;
    visited.add(name);
    for (const dependency of dependencies.get(name) ?? []) visit(dependency, [...chain, name]);
  }
  for (const name of definitions.keys()) visit(name, []);
  return issues;
}
