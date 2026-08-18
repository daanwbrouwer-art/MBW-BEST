import { Browser } from "@capacitor/browser";

// Static pages served straight from this repo's GitHub Pages deployment
// (see .github/workflows/deploy.yml, public/privacy/index.html,
// public/terms/index.html) — plain HTML, not part of the SPA route tree, so
// they're reachable at these exact URLs without running any client-side JS.
// That matters here specifically: both URLs need to work when Apple/Google
// reviewers hit them directly during App Store Connect / Play Console
// submission, not just when navigated to from inside the app.
//
// These previously pointed at https://my-bodyweight.com/pages/privacy-policy
// and .../terms-of-use (the Shopify marketing site) — confirmed via the
// Shopify Admin API that neither page actually exists there yet (the only
// content configured is Shopify's unfilled boilerplate legal-policy
// template, at a different URL shape entirely), so those links were dead.
export const PRIVACY_POLICY_URL =
  "https://daanwbrouwer-art.github.io/MBW-BEST/privacy/";
export const TERMS_OF_USE_URL =
  "https://daanwbrouwer-art.github.io/MBW-BEST/terms/";

export async function openPrivacyPolicy(): Promise<void> {
  await Browser.open({ url: PRIVACY_POLICY_URL });
}

export async function openTermsOfUse(): Promise<void> {
  await Browser.open({ url: TERMS_OF_USE_URL });
}
