export const currency = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(isFinite(v as number) ? (v as number) : 0);
};

export const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });

export const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: monthName(i + 1),
}));
