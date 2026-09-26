export const ESTIMATED_SALES_SHARE = 0.9;
export const ESTIMATED_LOSS_SHARE = 0.1;

export const roundEstimatedQuantity = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;
