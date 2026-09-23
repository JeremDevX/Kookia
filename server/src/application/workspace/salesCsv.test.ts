import { expect, it } from "vitest";
import { parseSalesCsv } from "./salesCsv.js";

it("parses documented CSV with quoted names, BOM and CRLF while rejecting invalid rows", () => {
  const csv = '\uFEFFservice_date,item_name,quantity\r\n2026-09-20,"Pizza, reine",2\r\n2026-09-21,,4\r\n2026-09-22,Salade,1.5\r\n';
  const result = parseSalesCsv(csv, "2026-09-23");
  expect(result.rows).toMatchObject([
    { line: 2, serviceDate: "2026-09-20", itemName: "Pizza, reine", quantity: 2 },
    { line: 3, error: "Nom d’article manquant ou trop long." },
    { line: 4, error: "Quantité entière positive attendue (maximum 1 000 000)." },
  ]);
  expect(result.rows[0].error).toBeUndefined();
  expect(() => parseSalesCsv('service_date,item_name,quantity\n2026-09-20,"Pizza,2', "2026-09-23")).toThrow("Champ CSV non fermé");
});
