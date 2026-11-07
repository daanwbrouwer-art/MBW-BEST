import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mybodyweight.app",
  appName: "MyBodyWeight",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    // Android shows only the shape of the status-bar icon, so it must be a
    // white logo on transparent (res/drawable-*/ic_stat_mbw.png); the full
    // colour app icon shows up as an empty square. iconColor tints it in the
    // notification shade (Volt lime).
    LocalNotifications: {
      smallIcon: "ic_stat_mbw",
      iconColor: "#C8F23A",
    },
  },
};

export default config;
