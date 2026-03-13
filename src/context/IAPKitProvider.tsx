import { ReactNode } from 'react';
import { IAPContext } from './IAPContext';
import { useIAPSetup, type UseIAPSetupConfig } from '../hooks/useIAPSetup';

export interface IAPKitProviderProps extends UseIAPSetupConfig {
  children: ReactNode;
}

export function IAPKitProvider({
  children,
  productIds,
  deferFinish,
  onPurchaseSuccess,
  onPurchaseError,
  onRestoreSuccess,
  onRestoreError,
  onNoSubscriptionFound,
  onSubscriptionExpired,
}: IAPKitProviderProps) {
  const { connected, restorePurchases, requestPurchase, finishTransaction } = useIAPSetup({
    productIds,
    deferFinish,
    onPurchaseSuccess,
    onPurchaseError,
    onRestoreSuccess,
    onRestoreError,
    onNoSubscriptionFound,
    onSubscriptionExpired,
  });

  return (
    <IAPContext.Provider value={{ connected, restorePurchases, requestPurchase, finishTransaction }}>
      {children}
    </IAPContext.Provider>
  );
}
