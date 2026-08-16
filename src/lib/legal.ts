import { Browser } from "@capacitor/browser";

export const PRIVACY_POLICY_URL =
  "https://my-bodyweight.com/pages/privacy-policy";
export const TERMS_OF_USE_URL = "https://my-bodyweight.com/pages/terms-of-use";

export async function openPrivacyPolicy(): Promise<void> {
  await Browser.open({ url: PRIVACY_POLICY_URL });
}

export async function openTermsOfUse(): Promise<void> {
  await Browser.open({ url: TERMS_OF_USE_URL });
}
