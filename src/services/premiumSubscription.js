import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { getCurrentSession } from './auth';
import { restorePremiumStatus } from './premiumGeneration';

const RC_API_KEY = process.env.EXPO_PUBLIC_RC_APPLE_API_KEY;
const RC_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'premium';
const PRODUCT_ID = process.env.EXPO_PUBLIC_APPSTORE_PRODUCT_ID || 'com.ritm.premium.monthly';

let isConfigured = false;

async function getCurrentUser() {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}

export async function configurePurchases() {
  if (Platform.OS !== 'ios') return;
  if (isConfigured) return;

  if (!RC_API_KEY) {
    throw new Error('EXPO_PUBLIC_RC_APPLE_API_KEY is missing');
  }

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  const user = await getCurrentUser();

  Purchases.configure({
    apiKey: RC_API_KEY,
    appUserID: user.id,
  });

  isConfigured = true;
}

export async function getCustomerInfo() {
  await configurePurchases();
  return Purchases.getCustomerInfo();
}

export async function getPremiumStateFromRevenueCat() {
  const info = await getCustomerInfo();
  const entitlement = info.entitlements?.active?.[RC_ENTITLEMENT_ID];

  return {
    isPremium: !!entitlement,
    expiresDate: entitlement?.expirationDate || null,
    productIdentifier: entitlement?.productIdentifier || PRODUCT_ID,
    originalTransactionId:
      info?.originalAppUserId || null,
    customerInfo: info,
  };
}

export async function purchasePremium() {
  await configurePurchases();

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;

  if (!current?.availablePackages?.length) {
    throw new Error('No available packages in RevenueCat offering');
  }

  const packageToBuy =
    current.availablePackages.find((pkg) => pkg.product.identifier === PRODUCT_ID) ||
    current.availablePackages[0];

  const result = await Purchases.purchasePackage(packageToBuy);
  return result.customerInfo;
}

export async function restorePremiumPurchases() {
  await configurePurchases();
  return Purchases.restorePurchases();
}

export async function syncPremiumStatusToSupabase() {
  const state = await getPremiumStateFromRevenueCat();
  const user = await getCurrentUser();

  const nowIso = new Date().toISOString();

  await supabase
    .from('profiles')
    .update({
      is_premium: state.isPremium,
      premium_expires_at: state.expiresDate,
      premium_plan: 'premium_monthly',
      premium_product_id: state.productIdentifier,
      premium_platform: 'ios',
      premium_last_verified_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', user.id);

  // опційно: синк у ваш restore endpoint
  if (state.expiresDate) {
    await restorePremiumStatus({
      productId: state.productIdentifier || PRODUCT_ID,
      originalTransactionId: user.id,
      expiresAt: state.expiresDate,
      isPremium: state.isPremium,
    });
  }

  return state;
}