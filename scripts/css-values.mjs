import valueParser from "postcss-value-parser";
import { cssKeywords } from "./css-keywords.mjs";

// CSS-wide keywords act on the declaration itself; putting them in a custom
// property changes their meaning (e.g. --x: inherit does not store "inherit").
export const cssWideKeywords = new Set([
  "inherit", "initial", "unset", "revert", "revert-layer",
]);

export function inspectValue(value, { property = "", keyframes = new Set() } = {}) {
  const references = new Set();
  const literals = [];
  const errors = [];
  let hasNativeValue = false;
  if (cssWideKeywords.has(value.trim().toLowerCase())) {
    return { references, literals, errors, hasNativeValue };
  }

  function visit(nodes) {
    for (const node of nodes) {
      if (node.unclosed) errors.push("valeur CSS non fermée");
      if (node.type === "function") {
        if (node.value.toLowerCase() !== "var") {
          visit(node.nodes);
          continue;
        }
        const args = node.nodes.filter((part) => !["space", "comment"].includes(part.type));
        const [name, separator, ...fallback] = args;
        if (name?.type !== "word" || !/^--[a-zA-Z_][\w-]*$/.test(name.value)) {
          errors.push("référence var() invalide");
        } else {
          references.add(name.value);
        }
        if (separator && (separator.type !== "div" || separator.value !== ",")) {
          errors.push("syntaxe var() invalide");
        }
        visit(fallback);
      } else if (node.type === "word" && !["+", "-", "*", "/"].includes(node.value)) {
        if (cssKeywords.has(node.value) ||
          (["animation", "animation-name"].includes(property) && keyframes.has(node.value))) {
          hasNativeValue = true;
        } else {
          literals.push(node.value);
        }
      } else if (node.type === "string") {
        literals.push(valueParser.stringify(node));
      }
    }
  }

  visit(valueParser(value).nodes);
  return { references, literals, errors, hasNativeValue };
}
