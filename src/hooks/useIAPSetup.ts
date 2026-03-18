import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { isExpoGo } from '../utils/isExpoGo';
import { useSubscription } from '../store/useSubscription';
import type { IAPKitConfig } from '../types';

// Only import expo-iap when not in Expo Go to avoid native module errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const expoIap = isExpoGo ? null : require('expo-iap');

export interface UseIAPSetupConfig {
  productIds: string[];
  deferFinish?: boolean;
  onPurchaseSuccess?: (purchase: any, finishTransaction: (purchase: any) => Promise<void>) => void | Promise<void>;
  onPurchaseError?: (error: { code?: string; message?: string }) => void;
  onRestoreSuccess?: (purchases: any[]) => void;
  onRestoreError?: () => void;
  onNoSubscriptionFound?: () => void;
  onSubscriptionExpired?: () => void;
}

export interface UseIAPSetupReturn {
  connected: boolean;
  products: any[];
  restorePurchases: () => Promise<void>;
  requestPurchase: ((options: any) => Promise<any>) | null;
  finishTransaction: (purchase: any) => Promise<void>;
  isSubscribed: boolean;
}

export function useIAPSetup(config: UseIAPSetupConfig): UseIAPSetupReturn {
  const {
    productIds,
    deferFinish = false,
    onPurchaseSuccess,
    onPurchaseError,
    onRestoreSuccess,
    onRestoreError,
    onNoSubscriptionFound,
    onSubscriptionExpired,
  } = config;

  const {
    setSubscribed,
    setLoading,
    setProducts,
    setCurrentPurchase,
    setEligibleForIntro,
    isSubscribed,
  } = useSubscription();

  // In Expo Go, return stub implementation
  if (isExpoGo) {
    return {
      connected: false,
      products: [],
      restorePurchases: async () => {
        // App can handle this via onRestoreError or show their own alert
        onRestoreError?.();
      },
      requestPurchase: null,
      finishTransaction: async () => {},
      isSubscribed,
    };
  }

  // Regular implementation for development/production builds
  const { useIAP, ErrorCode, isEligibleForIntroOfferIOS } = expoIap;

  // Ref to store finishTransaction since it's not available when defining callbacks
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const finishTransactionRef = useRef<((purchase: any) => Promise<void>) | null>(null);

  // Track processed transactions to avoid reprocessing replayed StoreKit events
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const processedTransactionsRef = useRef<Set<string>>(new Set());

  const handlePurchaseSuccess = useCallback(
    async (purchase: any) => {
      const txId = purchase?.transactionId || purchase?.id;

      if (txId && processedTransactionsRef.current.has(txId)) return;
      if (txId) processedTransactionsRef.current.add(txId);

      const finishTx = async (p: any) => {
        if (!finishTransactionRef.current) return;
        // Skip invalid transaction IDs (e.g., "0" from expired sandbox transactions)
        if (!p.transactionId || p.transactionId === '0') return;
        try {
          await finishTransactionRef.current({ purchase: p, isConsumable: false });
        } catch (err) {
          console.error('Failed to finish transaction:', err);
        }
      };

      // Validate expiration before trusting the purchase
      let isActive = false;
      let expiresAt: number | null = null;

      if (Platform.OS === 'ios') {
        if (purchase.expirationDateIOS) {
          isActive = purchase.expirationDateIOS > Date.now();
          expiresAt = purchase.expirationDateIOS;
        } else {
          await finishTx(purchase);
          setLoading(false);
          return;
        }
      } else if (Platform.OS === 'android') {
        isActive = purchase.autoRenewingAndroid === true;
      }

      if (!isActive) {
        await finishTx(purchase);
        setLoading(false);
        return;
      }

      setCurrentPurchase(purchase);
      setSubscribed(true, expiresAt);
      if (!deferFinish) {
        await finishTx(purchase);
      }
      setLoading(false);

      // Call app-specific success handler
      onPurchaseSuccess?.(purchase, exposedFinishTransaction);
    },
    [setCurrentPurchase, setSubscribed, setLoading, onPurchaseSuccess, deferFinish]
  );

  const handlePurchaseError = useCallback(
    (error: { code?: string; message?: string }) => {
      setLoading(false);

      if (error.code === ErrorCode.UserCancelled || error.code === 'user-cancelled') {
        return;
      }

      // Call app-specific error handler
      onPurchaseError?.(error);
    },
    [setLoading, ErrorCode, onPurchaseError]
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    fetchProducts,
    restorePurchases: iapRestorePurchases,
    getAvailablePurchases,
    getActiveSubscriptions,
    finishTransaction,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
  });

  // Assign synchronously so the ref is available before any replayed StoreKit events fire
  finishTransactionRef.current = finishTransaction;

  // Exposed finishTransaction for deferred finishing — errors propagate to the caller
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const exposedFinishTransaction = useCallback(
    async (purchase: any) => {
      if (!finishTransactionRef.current) return;
      if (!purchase.transactionId || purchase.transactionId === '0') return;
      await finishTransactionRef.current({ purchase, isConsumable: false });
    },
    []
  );

  // Fetch subscription products when connected
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (connected && productIds.length > 0) {
      setLoading(true);
      fetchProducts({
        skus: productIds,
        type: 'subs',
      })
        .catch((err: any) => {
          console.error('Failed to get subscriptions:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [connected, fetchProducts, setLoading, productIds]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (connected && getActiveSubscriptions && productIds.length > 0) {
      getActiveSubscriptions(productIds).catch(() => {});
    }
  }, [connected, getActiveSubscriptions, productIds]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (activeSubscriptions === undefined) return;

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      const sub = activeSubscriptions[0];
      const expiresAt = Platform.OS === 'ios' ? sub.expirationDateIOS : null;
      setSubscribed(true, expiresAt);
    } else if (Array.isArray(activeSubscriptions) && activeSubscriptions.length === 0) {
      setSubscribed(false, null);
    }
  }, [activeSubscriptions, setSubscribed]);

  // Store the products when available and check intro offer eligibility
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (subscriptions && subscriptions.length > 0) {
      setProducts(subscriptions);

      // Check intro offer eligibility (iOS only)
      const firstProduct = subscriptions[0];
      const groupId = firstProduct?.subscriptionInfoIOS?.subscriptionGroupId;
      if (groupId && Platform.OS === 'ios' && isEligibleForIntroOfferIOS) {
        isEligibleForIntroOfferIOS(groupId)
          .then((eligible: boolean) => setEligibleForIntro(eligible))
          .catch(() => setEligibleForIntro(false));
      } else {
        setEligibleForIntro(false);
      }
    }
  }, [subscriptions, setProducts, setEligibleForIntro]);

  // Track if we're waiting for restore result
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const isRestoringRef = useRef(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isRestoringRef.current) return;

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      const sub = activeSubscriptions[0];
      const expiresAt = Platform.OS === 'ios' ? sub.expirationDateIOS : null;
      setSubscribed(true, expiresAt);
      onRestoreSuccess?.(activeSubscriptions);
      isRestoringRef.current = false;
      setLoading(false);
      return;
    }

    if (availablePurchases && availablePurchases.length > 0) {
      const subscription = availablePurchases.find((p: any) =>
        productIds.includes(p.productId)
      );

      if (subscription) {
        const isActive =
          Platform.OS === 'ios'
            ? subscription.expirationDateIOS > Date.now()
            : subscription.autoRenewingAndroid === true;

        if (isActive) {
          setSubscribed(true, subscription.expirationDateIOS);
          onRestoreSuccess?.([subscription]);
        } else {
          setSubscribed(false);
          onSubscriptionExpired?.();
        }
        isRestoringRef.current = false;
        setLoading(false);
        return;
      }
    }

    if (activeSubscriptions !== undefined || availablePurchases !== undefined) {
      setSubscribed(false);
      onNoSubscriptionFound?.();
      isRestoringRef.current = false;
      setLoading(false);
    }
  }, [
    availablePurchases,
    activeSubscriptions,
    setSubscribed,
    setLoading,
    productIds,
    onRestoreSuccess,
    onSubscriptionExpired,
    onNoSubscriptionFound,
  ]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const restorePurchases = useCallback(async () => {
    if (!connected) {
      onRestoreError?.();
      return;
    }

    if (!iapRestorePurchases || !getAvailablePurchases || !getActiveSubscriptions) {
      onRestoreError?.();
      return;
    }

    try {
      setLoading(true);
      isRestoringRef.current = true;

      await Promise.all([
        iapRestorePurchases(),
        getAvailablePurchases(),
        getActiveSubscriptions(productIds),
      ]);
    } catch (err) {
      onRestoreError?.();
      isRestoringRef.current = false;
      setLoading(false);
    }
  }, [
    connected,
    iapRestorePurchases,
    getAvailablePurchases,
    getActiveSubscriptions,
    setLoading,
    productIds,
    onRestoreError,
  ]);

  return {
    connected,
    products: subscriptions || [],
    restorePurchases,
    requestPurchase,
    finishTransaction: exposedFinishTransaction,
    isSubscribed,
  };
}
