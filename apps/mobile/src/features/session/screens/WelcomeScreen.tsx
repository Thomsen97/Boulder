import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";
import { Button, Screen } from "@/theme/components";

import { useSession } from "../store";

/** Phase 2: buttons only. Phase 4 connects them to Supabase (Apple, Google, e-post code). */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const signIn = useSession((s) => s.signIn);

  return (
    <Screen>
      <View style={{ gap: spacing.sm, paddingVertical: spacing.xl }}>
        <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
          {t("app.name")}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>{t("welcome.tagline")}</Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button label={t("welcome.signInApple")} onPress={() => signIn()} />
        <Button variant="secondary" label={t("welcome.signInGoogle")} onPress={() => signIn()} />
        <Button variant="secondary" label={t("welcome.signInEmail")} onPress={() => signIn()} />
      </View>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        {t("welcome.mockNotice")}
      </Text>
    </Screen>
  );
}
