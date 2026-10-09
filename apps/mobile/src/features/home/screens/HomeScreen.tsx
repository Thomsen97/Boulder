import { useTranslation } from "react-i18next";

import { HealthIndicator } from "@/features/health/components/HealthIndicator";
import { PlaceholderScreen } from "@/features/PlaceholderScreen";

export function HomeScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t("tabs.home")} body={t("placeholder.home")}>
      <HealthIndicator />
    </PlaceholderScreen>
  );
}
