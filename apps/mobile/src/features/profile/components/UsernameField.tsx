import { useTranslation } from "react-i18next";

import { TextField } from "@/theme/components";

import type { AvailabilityState } from "../hooks";

interface UsernameFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  /** Result of useUsernameAvailability for the current value. */
  availability: AvailabilityState;
  /** Validation message (an i18n key) from the form. */
  errorKey?: string;
  hint?: string;
  editable?: boolean;
  /** Hides the "ledig" message while the value equals the user's current username. */
  unchanged?: boolean;
}

/** Username input with the live availability status (AUTH-3, AUTH-4). */
export function UsernameField({
  label,
  value,
  onChangeText,
  onBlur,
  availability,
  errorKey,
  hint,
  editable = true,
  unchanged = false,
}: UsernameFieldProps) {
  const { t } = useTranslation();

  const status =
    availability === "checking"
      ? { text: t("username.status.checking"), tone: "neutral" as const }
      : availability === "available" && !unchanged
        ? { text: t("username.status.available"), tone: "success" as const }
        : availability === "taken"
          ? { text: t("username.status.taken"), tone: "danger" as const }
          : availability === "error"
            ? { text: t("username.status.error"), tone: "danger" as const }
            : null;

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="username"
      maxLength={30}
      editable={editable}
      error={errorKey ? t(errorKey) : undefined}
      hint={status?.text ?? hint}
      hintTone={status?.tone ?? "neutral"}
    />
  );
}
