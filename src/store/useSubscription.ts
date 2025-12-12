import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ProductSubscription, Purchase } from 'expo-iap';

export const SUBSCRIPTION_STORAGE_KEY = 'expo-iap-kit-subscription';

export interface SubscriptionState {
  isSubscribed: boolean;
  expiresAt: number | null;
  loading: boolean;
  products: ProductSubscription[];
  currentPurchase: Purchase | null;
  isEligibleForIntro: boolean | null;
  setSubscribed: (subscribed: boolean, expiresAt?: number | null) => void;
  setLoading: (loading: boolean) => void;
  setProducts: (products: ProductSubscription[]) => void;
  setCurrentPurchase: (purchase: Purchase | null) => void;
  setEligibleForIntro: (eligible: boolean | null) => void;
  reset: () => void;
}

export const useSubscription = create<SubscriptionState>()(
  persist(
    (set) => ({
      isSubscribed: false,
      expiresAt: null,
      loading: false,
      products: [],
      currentPurchase: null,
      isEligibleForIntro: null,
      setSubscribed: (subscribed, expiresAt = null) =>
        set({ isSubscribed: subscribed, expiresAt }),
      setLoading: (loading) => set({ loading }),
      setProducts: (products) => set({ products }),
      setCurrentPurchase: (purchase) => set({ currentPurchase: purchase }),
      setEligibleForIntro: (eligible) => set({ isEligibleForIntro: eligible }),
      reset: () =>
        set({
          isSubscribed: false,
          expiresAt: null,
          loading: false,
          currentPurchase: null,
          isEligibleForIntro: null,
        }),
    }),
    {
      name: SUBSCRIPTION_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        isSubscribed: state.isSubscribed,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        // After loading from storage, validate expiration
        if (state && state.expiresAt && state.expiresAt < Date.now()) {
          state?.setSubscribed(false);
        }
      },
    }
  )
);

// Helper to get product by ID
export function getProductById(
  products: ProductSubscription[],
  productId: string
): ProductSubscription | null {
  return products.find((p) => p.id === productId) || null;
}
