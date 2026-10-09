import type { ReactNode } from "react";
import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing, typography, useColors } from "@/theme";

export function PlaceholderScreen({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: insets.top + spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textMuted }]}>{body}</Text>
      {children}
    </ScrollView>
  );
}
