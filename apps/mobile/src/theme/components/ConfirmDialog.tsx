import { Modal, Text, View } from "react-native";

import { radius, spacing, useColors, useTypography } from "@/theme";

import { Button } from "./Button";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors();
  const typography = useTypography();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          padding: spacing.lg,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.background,
            borderRadius: radius.lg,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>{message}</Text>
          <Button
            label={confirmLabel}
            variant={destructive ? "danger" : "primary"}
            onPress={onConfirm}
          />
          <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
