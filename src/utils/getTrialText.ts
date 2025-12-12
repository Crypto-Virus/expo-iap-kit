import type { ProductSubscription } from 'expo-iap';

export function getTrialText(
  product: ProductSubscription | null
): string | null {
  if (!product) return null;

  if ('introductoryPricePaymentModeIOS' in product) {
    if (product.introductoryPricePaymentModeIOS === 'free-trial') {
      const period = product.introductoryPriceSubscriptionPeriodIOS;
      const count = product.introductoryPriceNumberOfPeriodsIOS;

      if (period && count) {
        return `${parseInt(count, 10)}-${period}`;
      }
    }
  }

  if (
    'subscriptionOfferDetailsAndroid' in product &&
    Array.isArray(product.subscriptionOfferDetailsAndroid)
  ) {
    for (const offer of product.subscriptionOfferDetailsAndroid) {
      const phases = offer.pricingPhases?.pricingPhaseList;
      if (phases) {
        for (const phase of phases) {
          if (phase.priceAmountMicros === '0' && phase.billingPeriod) {
            const match = phase.billingPeriod.match(/^P(\d+)([DWMY])$/);
            if (match) {
              const unitMap: Record<string, string> = {
                D: 'day',
                W: 'week',
                M: 'month',
                Y: 'year',
              };
              const unit = unitMap[match[2]];
              if (unit) {
                return `${parseInt(match[1], 10)}-${unit}`;
              }
            }
          }
        }
      }
    }
  }

  return null;
}
