import { ActivityIndicator, Pressable, Text } from "react-native";

import { radius, spacing, useColors, useTypography } from "@/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useColors();
  const typography = useTypography();
  const inactive = disabled || loading;

  const background =
    variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : colors.surface;
  const foreground = variant === "secondary" ? colors.text : colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={{
        minHeight: 48,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: background,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: spacing.sm,
        opacity: inactive ? 0.5 : 1,
      }}
    >
      {loading ? <ActivityIndicator color={foreground} /> : null}
      <Text
        style={[typography.body, { color: foreground, fontWeight: "600", textAlign: "center" }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
