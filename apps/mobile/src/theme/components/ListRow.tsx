import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";

interface ListRowProps {
  label: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  /** "button" for navigation rows, "radio" for single-choice lists. */
  role?: "button" | "radio";
  disabled?: boolean;
}

export function ListRow({
  label,
  description,
  leading,
  trailing,
  onPress,
  selected,
  role = "button",
  disabled = false,
}: ListRowProps) {
  const colors = useColors();
  const typography = useTypography();

  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
      {trailing}
      {role === "radio" ? (
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={24}
          color={selected ? colors.primary : colors.textMuted}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      ) : null}
    </>
  );

  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    minHeight: 52,
    opacity: disabled ? 0.5 : 1,
  };

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={role === "radio" ? { selected: !!selected, disabled } : { disabled }}
      disabled={disabled}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  );
}
