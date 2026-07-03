export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "LSL",
): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  return new Intl.NumberFormat("en-LS", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}