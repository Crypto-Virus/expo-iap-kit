# Deferred Transaction Finishing

## Overview

Add a `deferFinish` option to expo-iap-kit that lets the consuming app control when StoreKit transactions are finished. Currently, transactions are auto-finished immediately after validation in `handlePurchaseSuccess`. With `deferFinish: true`, the happy-path auto-finish is skipped and a `finishTransaction` function is exposed, letting the app finish the transaction only after confirming the receipt with its backend. Early-return paths (invalid, expired, already-subscribed) still auto-finish.

This is needed for apps that send receipts to an external service (e.g., RevenueRat) and must not finish the transaction until the service confirms — leaving unfinished transactions so StoreKit replays them on next app launch if confirmation fails.

## User Stories

- As an app developer, I want to defer transaction finishing so I can confirm the receipt with my backend before telling StoreKit the transaction is done
- As an app developer, I want unfinished transactions to replay on next app launch if my backend was unreachable during purchase
- As an app developer, I want early-return paths (expired, invalid, duplicate) to still auto-finish so they don't replay forever
- As an app developer, I want access to restore transaction data so I can send it to my backend

## Requirements

### Must Have

- [ ] `deferFinish` option (boolean, default `false`) on `UseIAPSetupConfig` and `IAPKitProviderProps`
- [ ] When `deferFinish: true`, skip `finishTx(purchase)` call on the happy path in `handlePurchaseSuccess` — the line after `onPurchaseSuccess` fires
- [ ] When `deferFinish: true`, early-return paths still auto-finish (invalid transaction ID, expired subscription, already subscribed)
- [ ] When `deferFinish: false` (default), behavior is identical to today — no breaking changes
- [ ] Expose `finishTransaction(purchase)` in the return value of `useIAPSetup` and in `IAPContextValue`
- [ ] `onRestoreSuccess` callback signature changes from `() => void` to `(purchases: Purchase[]) => void` — passes the array of active restored purchases so the app can extract transaction IDs for its backend
- [ ] `onPurchaseSuccess` continues to receive the `Purchase` object (no change needed — already works this way)

### Won't Have

- Retry logic for backend calls — that's the consuming app's responsibility
- Any backend/network calls from within expo-iap-kit itself

## Technical Design

### Config Changes

**`types.ts` — `IAPKitConfig` interface:**

```typescript
interface IAPKitConfig {
  productIds: string[];
  deferFinish?: boolean; // NEW — default false
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: { code?: string; message?: string }) => void;
  onRestoreSuccess?: (purchases: Purchase[]) => void; // CHANGED — was () => void
  onRestoreError?: () => void;
  onNoSubscriptionFound?: () => void;
  onSubscriptionExpired?: () => void;
}
```

### `useIAPSetup` Changes

**Return value — add `finishTransaction`:**

```typescript
interface UseIAPSetupReturn {
  connected: boolean;
  products: any[];
  restorePurchases: () => Promise<void>;
  requestPurchase: ((options: any) => Promise<any>) | null;
  isSubscribed: boolean;
  finishTransaction: (purchase: Purchase) => Promise<void>; // NEW
}
```

`finishTransaction` wraps `finishTransactionRef.current` with the same guards as the existing `finishTx` helper (skip if no ref, skip if transactionId is `'0'` or missing). Always available regardless of `deferFinish` — apps may need it for edge-case manual finishing.

**`handlePurchaseSuccess` — conditional finish:**

Current happy-path flow:
```
setCurrentPurchase(purchase)
setSubscribed(true, expiresAt)
await finishTx(purchase)        // <-- auto-finish
onPurchaseSuccess?.(purchase)
```

New happy-path flow when `deferFinish: true`:
```
setCurrentPurchase(purchase)
setSubscribed(true, expiresAt)
// finishTx SKIPPED
onPurchaseSuccess?.(purchase)
```

Early-return paths (before the happy path) are unchanged — they always call `finishTx`:
- Transaction already processed (duplicate) → return early (no finish needed, already handled)
- No `expirationDateIOS` → `finishTx` + return
- Subscription not active (expired) → `finishTx` + return
- Already subscribed → `finishTx` + return

**Restore flow — pass purchases to `onRestoreSuccess`:**

In the restore effect that monitors `activeSubscriptions` and `availablePurchases`:
- When active subscriptions are found, collect the `Purchase` objects and pass them: `onRestoreSuccess?.(activePurchases)`
- When available purchases path finds a match, pass it as a single-element array: `onRestoreSuccess?.([matchingPurchase])`

When `deferFinish: true`, the restore flow does NOT auto-finish restored transactions. The app is responsible for calling `finishTransaction` on each after backend confirmation. When `deferFinish: false`, existing behavior is preserved (restore doesn't explicitly finish — StoreKit handles it via `AppStore.sync()`).

### `IAPKitProvider` / Context Changes

**`IAPContext.tsx` — `IAPContextValue`:**

```typescript
interface IAPContextValue {
  connected: boolean;
  restorePurchases: () => Promise<void>;
  requestPurchase: ((options: any) => Promise<any>) | null;
  finishTransaction: (purchase: Purchase) => Promise<void>; // NEW
}
```

**`IAPKitProvider.tsx`:**

- Accept `deferFinish` prop, pass to `useIAPSetup`
- Extract `finishTransaction` from hook return, pass to context value

### Exports

`finishTransaction` is already exposed through context. No new top-level exports needed beyond the type changes.

## Edge Cases

- **`finishTransaction` called when not connected**: The underlying `finishTransactionRef.current` will be null. The wrapper returns early silently (same as existing `finishTx` guard).
- **`finishTransaction` called twice for same purchase**: StoreKit handles idempotently. No harm.
- **`deferFinish: false` (default)**: Entire existing behavior preserved. `finishTransaction` is still exposed but not needed.
- **App crashes before calling `finishTransaction`**: Transaction stays unfinished. StoreKit replays it on next launch. `handlePurchaseSuccess` fires again, `onPurchaseSuccess` fires again, app retries backend confirmation.
- **Restore with `deferFinish: true`**: Restored transactions from `AppStore.sync()` / `currentEntitlements` are already finished by StoreKit — `deferFinish` only affects new purchases replayed via the transaction listener. The `onRestoreSuccess` callback passes the purchase data so the app can send transaction IDs to its backend regardless.

## Testing

- **Manual**: Purchase with `deferFinish: true` → verify transaction stays unfinished (check StoreKit logs) → call `finishTransaction` → verify finished
- **Manual**: Purchase with `deferFinish: false` → verify auto-finish (existing behavior)
- **Manual**: Kill app before calling `finishTransaction` → relaunch → verify `onPurchaseSuccess` fires again with replayed transaction
- **Manual**: Restore → verify `onRestoreSuccess` receives purchase array with transaction data
