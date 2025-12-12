// Provider
export { IAPKitProvider, type IAPKitProviderProps } from './context/IAPKitProvider';

// Hooks
export { useIAPSetup, type UseIAPSetupConfig, type UseIAPSetupReturn } from './hooks/useIAPSetup';
export { useIAPContext } from './context/IAPContext';

// Store
export { useSubscription, getProductById, SUBSCRIPTION_STORAGE_KEY, type SubscriptionState } from './store/useSubscription';

// Utilities
export {
  calculateWeeklyPrice,
  calculateYearlyDiscount,
  calculateDiscountPercent,
  formatWeeklyPrice,
  extractPrice,
} from './utils/pricing';
export { getTrialText } from './utils/getTrialText';
export { isExpoGo } from './utils/isExpoGo';

// Types
export type {
  IAPKitConfig,
  IAPKitState,
  IAPKitActions,
  IAPKitStore,
  IAPContextValue,
  ProductSubscription,
  Purchase,
} from './types';
