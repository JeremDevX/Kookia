export const isValidOrderQuantity = (value: string): boolean => {
  const quantity = Number(value);
  return /^\d+(?:\.\d{1,3})?$/.test(value.trim()) && Number.isFinite(quantity) && quantity > 0 && quantity <= 1_000_000;
};
