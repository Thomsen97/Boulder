import { Text, View } from "react-native";

import { useColors } from "@/theme";

interface AvatarProps {
  /** Name used for the initials placeholder; images arrive with the media phase. */
  name: string;
  size?: number;
}

export function Avatar({ name, size = 64 }: AvatarProps) {
  const colors = useColors();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: size * 0.36, fontWeight: "600" }}>
        {initials || "?"}
      </Text>
    </View>
  );
}
