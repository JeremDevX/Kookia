import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

export const globalCssPath = new URL("../src/styles/index.css", import.meta.url);

export function readMediaDefinitions(root) {
  const definitions = new Map();
  root.walkAtRules("custom-media", (rule) => {
    const match = /^(--[a-zA-Z_][\w-]*)\s+(\([^{};]+\))$/.exec(rule.params);
    if (!match || rule.nodes || rule.parent !== root) {
      throw rule.error("Définition @custom-media invalide (alias et condition attendus).");
    }
    const [, name, condition] = match;
    if (definitions.has(name)) throw rule.error(`Alias média dupliqué : ${name}`);
    if (/\(\s*--|var\(/.test(condition)) {
      throw rule.error("Les conditions globales doivent être explicites, sans alias imbriqué.");
    }
    definitions.set(name, condition);
  });
  return definitions;
}

export function mediaAlias(params) {
  return /^\(\s*(--[a-zA-Z_][\w-]*)\s*\)$/.exec(params)?.[1];
}

// Only the single named-condition syntax used by this project is supported.
// Native var() cannot be used in media queries. Expand aliases at build time
// without moving rules or changing their order in the cascade.
export function globalMediaPlugin(file = globalCssPath) {
  return {
    postcssPlugin: "kookia-global-media",
    Once(root, { result }) {
      const globalRoot = postcss.parse(readFileSync(file, "utf8"), { from: String(file) });
      const definitions = readMediaDefinitions(globalRoot);
      result.messages.push({
        type: "dependency", plugin: "kookia-global-media",
        file: file instanceof URL ? fileURLToPath(file) : file,
        parent: root.source?.input.file,
      });
      root.walkAtRules("custom-media", (rule) => rule.remove());
      root.walkAtRules("media", (rule) => {
        const alias = mediaAlias(rule.params);
        if (!alias || !definitions.has(alias)) {
          throw rule.error(`Condition média non centralisée ou inconnue : ${rule.params}`);
        }
        rule.params = definitions.get(alias);
      });
    },
  };
}
