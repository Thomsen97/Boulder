import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { typography, useColors } from "@/theme";

import { useHealth } from "../hooks";

export function HealthIndicator() {
  const { t } = useTranslation();
  const colors = useColors();
  const { data, isPending, isError } = useHealth();

  const failed = isError || data === "Unhealthy";
  const message = isPending ? t("health.loading") : failed ? t("health.error") : t("health.ok");

  return (
    <Text
      accessibilityLabel={`${t("health.label")}: ${message}`}
      style={[typography.caption, { color: failed ? colors.danger : colors.textMuted }]}
    >
      {t("health.label")}: {message}
    </Text>
  );
}
