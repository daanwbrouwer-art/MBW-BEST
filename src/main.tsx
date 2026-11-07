import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { COMING_SOON_ILLUSTRATION } from "./data/exerciseAssets";
import "./index.css";
import { applyPalette, getStoredPalette } from "./theme/palettes";

// Before first render, so the chosen four-colour palette paints immediately.
applyPalette(getStoredPalette(), false);

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Only configure RevenueCat inside a native Capacitor shell (iOS/Android) —
// there's no App Store/Play billing to talk to in a plain browser dev build,
// and the plugin has no meaningful web implementation. See src/lib/payments.ts
// for the purchase/restore side of this same native/mock split.
if (Capacitor.isNativePlatform()) {
  const apiKey =
    Capacitor.getPlatform() === "ios"
      ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
      : import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;
  if (apiKey) {
    Purchases.configure({ apiKey });
  } else {
    console.error(
      `Missing RevenueCat API key for platform "${Capacitor.getPlatform()}", set VITE_REVENUECAT_IOS_API_KEY / VITE_REVENUECAT_ANDROID_API_KEY (see .env.example).`,
    );
  }
}

// Some deck cards name an exercise picture that isn't drawn yet (mostly in
// the women's decks). A broken image anywhere becomes the honest "coming
// soon" card instead (error events don't bubble, hence capture).
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (
      img instanceof HTMLImageElement &&
      img.src.includes("/assets/exercises/") &&
      img.src !== COMING_SOON_ILLUSTRATION
    ) {
      img.src = COMING_SOON_ILLUSTRATION;
    }
  },
  true,
);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
