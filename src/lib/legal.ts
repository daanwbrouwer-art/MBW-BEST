import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

// Legal pages live on the official website (Shopify Online Store pages,
// created 2026-10-31) so every in-app link lands on my-bodyweight.com. These
// same URLs go into the Play Console / App Store Connect privacy-policy and
// account-deletion fields. The old GitHub Pages copies (public/privacy etc.)
// now only redirect here.
const SITE = "https://my-bodyweight.com/pages";
export const PRIVACY_POLICY_URL = `${SITE}/privacy-policy`;
export const TERMS_OF_USE_URL = `${SITE}/terms-of-service`;
export const SUBSCRIPTION_TERMS_URL = `${SITE}/subscription-terms`;
export const DELETE_ACCOUNT_URL = `${SITE}/delete-account`;

// Google Play's Subscriptions policy requires an in-app link to manage and
// cancel subscriptions (the store's own Subscription Center), and the
// Subscription Terms tell users it lives at Profile → Manage subscription.
const ANDROID_PACKAGE = "com.mybodyweight.app";
const PLAY_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}`;
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

export async function openManageSubscriptions(): Promise<void> {
  const url =
    Capacitor.getPlatform() === "ios"
      ? APPLE_SUBSCRIPTIONS_URL
      : PLAY_SUBSCRIPTIONS_URL;
  await Browser.open({ url });
}

export async function openSubscriptionTerms(): Promise<void> {
  await Browser.open({ url: SUBSCRIPTION_TERMS_URL });
}

export async function openPrivacyPolicy(): Promise<void> {
  await Browser.open({ url: PRIVACY_POLICY_URL });
}

export async function openTermsOfUse(): Promise<void> {
  await Browser.open({ url: TERMS_OF_USE_URL });
}
