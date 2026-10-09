import type { ExpoConfig } from "expo/config";

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
  plugins: ["expo-router", "expo-localization"],
  experiments: { typedRoutes: true },
};

export default config;
