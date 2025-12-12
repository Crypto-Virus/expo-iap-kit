# expo-iap-kit

Plug-and-play IAP subscriptions for Expo apps. iOS focused.

## Installation

```bash
npm install github:Crypto-Virus/expo-iap-kit
```

## Peer Dependencies

```bash
npm install expo-iap zustand @react-native-async-storage/async-storage
```

## Usage

### 1. Wrap your app with IAPKitProvider

```tsx
import { IAPKitProvider } from 'expo-iap-kit';
import { Alert } from 'react-native';

export default function App() {
  return (
    <IAPKitProvider
      productIds={['my_weekly_sub', 'my_yearly_sub']}
      onPurchaseSuccess={() => {
        Alert.alert('Thank You!', 'Your subscription is now active.');
      }}
      onPurchaseError={(error) => {
        Alert.alert('Purchase Failed', error.message || 'Please try again.');
      }}
      onRestoreSuccess={() => {
        Alert.alert('Restored!', 'Your subscription has been restored.');
      }}
      onRestoreError={() => {
        Alert.alert('Restore Failed', 'Could not restore purchases.');
      }}
      onNoSubscriptionFound={() => {
        Alert.alert('Not Found', 'No active subscription found.');
      }}
      onSubscriptionExpired={() => {
        Alert.alert('Expired', 'Your subscription has expired.');
      }}
    >
      <YourApp />
    </IAPKitProvider>
  );
}
```

### 2. Use hooks anywhere in your app

```tsx
import { useSubscription, useIAPContext, getProductById } from 'expo-iap-kit';

function PaywallScreen() {
  const { isSubscribed, products, loading, isEligibleForIntro } = useSubscription();
  const { requestPurchase, restorePurchases, connected } = useIAPContext();

  const weeklyProduct = getProductById(products, 'my_weekly_sub');
  const yearlyProduct = getProductById(products, 'my_yearly_sub');

  const handlePurchase = async (sku: string) => {
    if (!requestPurchase) return;
    await requestPurchase({
      type: 'subs',
      request: { ios: { sku } },
    });
  };

  if (isSubscribed) {
    return <Text>You're subscribed!</Text>;
  }

  return (
    <View>
      <Button title="Subscribe Weekly" onPress={() => handlePurchase('my_weekly_sub')} />
      <Button title="Subscribe Yearly" onPress={() => handlePurchase('my_yearly_sub')} />
      <Button title="Restore Purchases" onPress={restorePurchases} />
    </View>
  );
}
```

## Utilities

```tsx
import {
  extractPrice,
  formatWeeklyPrice,
  calculateDiscountPercent,
  getTrialText,
  isExpoGo,
} from 'expo-iap-kit';

// Extract numeric price from product
const price = extractPrice(product?.price); // 9.99

// Format yearly price as weekly
formatWeeklyPrice(49.99, 'USD', 'year'); // "~$0.96/week"

// Calculate discount percentage
calculateDiscountPercent(5.99 * 52, 49.99); // 84

// Get trial period text from product
getTrialText(product); // "7-day" or null

// Check if running in Expo Go (IAP unavailable)
if (isExpoGo) {
  // Show message that purchases require dev build
}
```

## API

### IAPKitProvider Props

| Prop | Type | Description |
|------|------|-------------|
| `productIds` | `string[]` | Array of subscription product IDs |
| `onPurchaseSuccess` | `(purchase) => void` | Called after successful purchase |
| `onPurchaseError` | `(error) => void` | Called on purchase error (not cancellation) |
| `onRestoreSuccess` | `() => void` | Called after successful restore |
| `onRestoreError` | `() => void` | Called on restore error |
| `onNoSubscriptionFound` | `() => void` | Called when restore finds no subscription |
| `onSubscriptionExpired` | `() => void` | Called when restored subscription is expired |

### useSubscription Store

| Property | Type | Description |
|----------|------|-------------|
| `isSubscribed` | `boolean` | Whether user has active subscription |
| `products` | `ProductSubscription[]` | Fetched product details |
| `loading` | `boolean` | Loading state |
| `isEligibleForIntro` | `boolean \| null` | Intro offer eligibility (iOS) |
| `expiresAt` | `number \| null` | Subscription expiration timestamp |

### useIAPContext

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | StoreKit connection status |
| `requestPurchase` | `function \| null` | Initiate purchase |
| `restorePurchases` | `() => Promise<void>` | Restore previous purchases |

## Notes

- iOS focused (Android support planned)
- Expo Go not supported (requires dev build)
- Subscription state persisted to AsyncStorage
- Expiration validated on app launch

## License

MIT
