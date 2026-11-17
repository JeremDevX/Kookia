export const receiptThousandths = (quantity: number) => Math.round(quantity * 1_000);

export function receivedThousandths(progress: readonly { receivedQuantity: number }[]) {
  return progress.reduce((total, line) => total + receiptThousandths(line.receivedQuantity), 0);
}

export function availableReceiptThousandths(invoice: number, received: number, orderRemainder: number) {
  return Math.max(0, Math.min(receiptThousandths(invoice) - received, receiptThousandths(orderRemainder)));
}
