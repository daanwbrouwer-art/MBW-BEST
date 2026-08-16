import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

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
      `Missing RevenueCat API key for platform "${Capacitor.getPlatform()}" — set VITE_REVENUECAT_IOS_API_KEY / VITE_REVENUECAT_ANDROID_API_KEY (see .env.example).`,
    );
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
