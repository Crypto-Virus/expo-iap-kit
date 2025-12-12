import { createContext, useContext } from 'react';
import type { IAPContextValue } from '../types';

const IAPContext = createContext<IAPContextValue | null>(null);

export { IAPContext };

export function useIAPContext(): IAPContextValue {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error('useIAPContext must be used within an IAPKitProvider');
  }
  return context;
}
