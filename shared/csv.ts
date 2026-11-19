export class CsvSyntaxError extends Error {}

export function splitCsv(csv: string, delimiter: "," | ";" = ",") {
  const records: { line: number; fields: string[] }[] = [];
  const text = csv.replace(/\r\n?/g, "\n");
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  let line = 1;
  let rowLine = 1;
  const finishField = () => {
    fields.push(field);
    field = "";
    closed = false;
  };
  const finishRow = () => {
    finishField();
    if (fields.length !== 1 || fields[0].trim()) records.push({ line: rowLine, fields });
    fields = [];
    rowLine = line + 1;
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else {
        field += char;
        if (char === "\n") line++;
      }
    } else if (char === delimiter) {
      finishField();
    } else if (char === "\n") {
      finishRow();
      line++;
    } else if (char === '"' && field === "" && !closed) {
      quoted = true;
    } else if (closed || char === '"') {
      throw new CsvSyntaxError(`Syntaxe CSV invalide à la ligne ${line}.`);
    } else {
      field += char;
    }
  }
  if (quoted) throw new CsvSyntaxError("Champ CSV non fermé.");
  finishRow();
  return records;
}
