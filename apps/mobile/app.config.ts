import type { ExpoConfig } from "expo/config";

// Set by EAS for the "development" profile; release builds must never allow cleartext traffic.
const isDevelopmentBuild = process.env.EAS_BUILD_PROFILE === "development";

const config: ExpoConfig = {
  name: "Boulder",
  slug: "boulder",
  version: "0.1.0",
  scheme: "boulder",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "no.swthomsen.boulder",
    supportsTablet: false,
  },
  android: {
    package: "no.swthomsen.boulder",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
  plugins: [
    "expo-router",
    "expo-localization",
    "expo-secure-store",
    "expo-web-browser",
    // The development build talks to the API on the PC over plain HTTP (README: local API from a phone).
    ["expo-build-properties", { android: { usesCleartextTraffic: isDevelopmentBuild } }],
  ],
};

export default config;
