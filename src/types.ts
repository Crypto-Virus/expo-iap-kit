import type { ProductSubscription, Purchase } from 'expo-iap';

export interface IAPKitConfig {
  productIds: string[];
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: { code?: string; message?: string }) => void;
  onRestoreSuccess?: () => void;
  onRestoreError?: () => void;
  onNoSubscriptionFound?: () => void;
  onSubscriptionExpired?: () => void;
}

export interface IAPKitState {
  isSubscribed: boolean;
  expiresAt: number | null;
  loading: boolean;
  products: ProductSubscription[];
  currentPurchase: Purchase | null;
  isEligibleForIntro: boolean | null;
}

export interface IAPKitActions {
  setSubscribed: (subscribed: boolean, expiresAt?: number | null) => void;
  setLoading: (loading: boolean) => void;
  setProducts: (products: ProductSubscription[]) => void;
  setCurrentPurchase: (purchase: Purchase | null) => void;
  setEligibleForIntro: (eligible: boolean | null) => void;
  reset: () => void;
}

export type IAPKitStore = IAPKitState & IAPKitActions;

export interface IAPContextValue {
  connected: boolean;
  restorePurchases: () => Promise<void>;
  requestPurchase: ((options: any) => Promise<any>) | null;
}

export type { ProductSubscription, Purchase } from 'expo-iap';
