import { Text, TextInput, View, type TextInputProps } from "react-native";

import { radius, spacing, useColors, useTypography } from "@/theme";

interface TextFieldProps extends Pick<
  TextInputProps,
  | "value"
  | "onChangeText"
  | "onBlur"
  | "placeholder"
  | "autoCapitalize"
  | "autoCorrect"
  | "multiline"
  | "maxLength"
  | "editable"
  | "returnKeyType"
  | "textContentType"
> {
  label: string;
  /** Helper text or status shown under the field. */
  hint?: string;
  hintTone?: "neutral" | "success" | "danger";
  /** Error text; takes the place of the hint. */
  error?: string;
}

export function TextField({ label, hint, hintTone = "neutral", error, ...input }: TextFieldProps) {
  const colors = useColors();
  const typography = useTypography();
  const message = error ?? hint;
  const tone = error ? "danger" : hintTone;
  const messageColor =
    tone === "danger" ? colors.danger : tone === "success" ? colors.success : colors.textMuted;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...input}
        style={[
          typography.body,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            minHeight: 48,
            opacity: input.editable === false ? 0.6 : 1,
          },
          input.multiline ? { minHeight: 96, textAlignVertical: "top" } : null,
        ]}
      />
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.caption, { color: messageColor }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
