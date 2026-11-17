import { expect, it } from "vitest";
import { availableReceiptThousandths, receivedThousandths, receiptThousandths } from "./receiptQuantity";

it("accepte le solde d’une facture de 0,3 kg après une première livraison de 0,1 kg", () => {
  const progress = receivedThousandths([{ receivedQuantity: 0.1 }]);
  const available = availableReceiptThousandths(0.3, progress, 0.2);
  expect(available / 1_000).toBe(0.2);
  expect(receiptThousandths(0.2)).toBe(available);
  expect(receiptThousandths(0.201)).toBeGreaterThan(available);
});

it("additionne les réceptions exactes et applique aussi le reliquat de commande", () => {
  const progress = receivedThousandths([{ receivedQuantity: 0.1 }, { receivedQuantity: 0.2 }]);
  expect(progress / 1_000).toBe(0.3);
  expect(availableReceiptThousandths(0.7, progress, 0.25)).toBe(250);
  expect(availableReceiptThousandths(0.3, progress, 0.25)).toBe(0);
});
