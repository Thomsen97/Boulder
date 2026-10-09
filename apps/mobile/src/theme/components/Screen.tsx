import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing, useColors, useTypography } from "@/theme";

interface ScreenProps {
  title?: string;
  /** Shows a back button that pops the stack. */
  back?: boolean;
  /** Content shown right of the title, for example an action button. */
  headerRight?: ReactNode;
  children: ReactNode;
}

/**
 * Standard screen frame: safe area, scrolling, an optional back button and a heading.
 * It draws its own header instead of the native one, which has a fixed height and clips at
 * large text sizes.
 */
export function Screen({ title, back, headerRight, children }: ScreenProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.md,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={8}
          style={{
            minHeight: 44,
            minWidth: 44,
            alignSelf: "flex-start",
            justifyContent: "center",
            borderRadius: radius.md,
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
      ) : null}
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={[typography.title, { color: colors.text, flex: 1 }]}
          >
            {title}
          </Text>
          {headerRight}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}
