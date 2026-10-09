import type { ReactNode } from "react";
import { Text, View } from "react-native";

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
  return (
    <View
      style={{ flex: 1, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.background }}
    >
      <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
        {title}
      </Text>
      <Text style={[typography.body, { color: colors.textMuted }]}>{body}</Text>
      {children}
    </View>
  );
}
