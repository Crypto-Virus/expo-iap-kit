export function calculateWeeklyPrice(
  price: number,
  period: 'month' | 'year'
): number {
  if (period === 'month') {
    // ~4.33 weeks per month
    return price / 4.33;
  }
  // 52 weeks per year
  return price / 52;
}

export function calculateYearlyDiscount(
  monthlyPrice: number,
  yearlyPrice: number
): number {
  const yearlyIfMonthly = monthlyPrice * 12;
  if (yearlyIfMonthly <= 0) return 0;
  return Math.round(((yearlyIfMonthly - yearlyPrice) / yearlyIfMonthly) * 100);
}

export function calculateDiscountPercent(
  regularPrice: number,
  discountedPrice: number
): number {
  if (regularPrice <= 0) return 0;
  const percent = ((regularPrice - discountedPrice) / regularPrice) * 100;
  if (!Number.isFinite(percent)) return 0;
  if (percent <= 0) return 0;
  return Math.round(percent);
}

export function formatWeeklyPrice(
  price: number,
  currency: string,
  period: 'month' | 'year'
): string {
  const weekly = calculateWeeklyPrice(price, period);

  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(weekly);

  return `~${formatted}/week`;
}

export function extractPrice(
  priceValue: number | string | null | undefined
): number {
  if (priceValue == null) return 0;
  if (typeof priceValue === 'number') return priceValue;
  const cleaned = String(priceValue).replace(/[^0-9.,]/g, '');
  if (!cleaned) return 0;

  // Handle locales that use comma as decimal separator (e.g., "3,99")
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  // Default: strip thousands separators and parse
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}
