import { Switch, Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: SwitchRowProps) {
  const colors = useColors();
  const typography = useTypography();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 48,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}
