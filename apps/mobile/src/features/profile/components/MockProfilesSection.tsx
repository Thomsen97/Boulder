import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { getApiMode } from "@/lib/api/mode";
import { getDb } from "@/lib/mock/db";
import { spacing, useColors, useTypography } from "@/theme";
import { ListRow } from "@/theme/components";

const MISSING_USERNAME = "finnesikke";

/**
 * Mock-only shortcut to the example profiles, so every profile state can be opened before user
 * search exists. Remove together with the mock layer when search arrives in phase 5.
 */
export function MockProfilesSection() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();

  if (getApiMode("profile") !== "mock") return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={[typography.body, { color: colors.text, fontWeight: "700" }]}
      >
        {t("settings.mockProfilesSection")}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        {t("settings.mockProfilesHint")}
      </Text>
      {getDb().users.map((user) => (
        <ListRow
          key={user.id}
          label={user.displayName}
          description={`@${user.username}`}
          onPress={() => router.push(`/user/${user.username}`)}
        />
      ))}
      <ListRow
        label={t("settings.mockProfilesMissing")}
        description={`@${MISSING_USERNAME}`}
        onPress={() => router.push(`/user/${MISSING_USERNAME}`)}
      />
    </View>
  );
}
