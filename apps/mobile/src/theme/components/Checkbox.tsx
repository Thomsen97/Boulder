import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { radius, spacing, useColors, useTypography } from "@/theme";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function Checkbox({ label, checked, onChange, error }: CheckboxProps) {
  const colors = useColors();
  const typography = useTypography();

  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.sm,
            borderWidth: 2,
            borderColor: error ? colors.danger : checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked ? <Ionicons name="checkmark" size={20} color={colors.onPrimary} /> : null}
        </View>
        <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text>
      </Pressable>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}
