export const formatQuantity = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format;
export const formatPercent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format;

export const formatDisplayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
