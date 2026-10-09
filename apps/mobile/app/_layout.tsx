import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import "@/i18n";
import { QueryProvider } from "@/lib/api/QueryProvider";

export default function RootLayout() {
  return (
    <QueryProvider>
      <StatusBar style="auto" />
      <Slot />
    </QueryProvider>
  );
}
