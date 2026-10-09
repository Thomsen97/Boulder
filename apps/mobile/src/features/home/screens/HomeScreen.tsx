import { useTranslation } from "react-i18next";

import { HealthStatus } from "@/features/health/screens/HealthStatus";
import { PlaceholderScreen } from "@/features/PlaceholderScreen";

export function HomeScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t("tabs.home")} body={t("placeholder.home")}>
      <HealthStatus />
    </PlaceholderScreen>
  );
}
