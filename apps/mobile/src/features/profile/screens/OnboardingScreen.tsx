import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";
import { Avatar, Button, Checkbox, Screen, TextField } from "@/theme/components";

import { UsernameField } from "../components/UsernameField";
import { GUIDELINES_VERSION } from "../guidelines";
import { useCompleteOnboarding, useUsernameAvailability } from "../hooks";
import { onboardingSchema, type OnboardingForm } from "../schemas";
import { ApiError } from "@/lib/api/errors";

/** AUTH-3: username, display name, optional avatar, 16+ checkbox, community guidelines. */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const complete = useCompleteOnboarding();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      displayName: "",
      ageConfirmed: false,
      guidelinesAccepted: false,
    },
  });
  const { control, handleSubmit, setError, formState } = form;
  const username = useWatch({ control, name: "username" });
  const displayName = useWatch({ control, name: "displayName" });
  const availability = useUsernameAvailability(username);

  const canSubmit = formState.isValid && availability === "available" && !complete.isPending;

  const submit = handleSubmit((values) => {
    setSubmitError(null);
    complete.mutate(
      {
        username: values.username,
        displayName: values.displayName,
        ageConfirmed: values.ageConfirmed,
        guidelinesVersion: GUIDELINES_VERSION,
      },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.code === "username_taken") {
            setError("username", { message: "onboarding.error.usernameTaken" });
          } else {
            setSubmitError(t("onboarding.error.generic"));
          }
        },
      },
    );
  });

  return (
    <Screen title={t("onboarding.title")}>
      <Text style={[typography.body, { color: colors.textMuted }]}>{t("onboarding.intro")}</Text>

      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Avatar name={displayName || username} size={88} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {t("onboarding.avatarLater")}
        </Text>
      </View>

      <Controller
        control={control}
        name="username"
        render={({ field, fieldState }) => (
          <UsernameField
            label={t("onboarding.usernameLabel")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            availability={availability}
            errorKey={fieldState.isTouched || field.value ? fieldState.error?.message : undefined}
            hint={t("onboarding.usernameHint")}
          />
        )}
      />

      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label={t("onboarding.displayNameLabel")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={60}
            textContentType="name"
            error={
              fieldState.isTouched && fieldState.error?.message
                ? t(fieldState.error.message)
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="ageConfirmed"
        render={({ field }) => (
          <Checkbox
            label={t("onboarding.ageLabel")}
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <View style={{ gap: spacing.sm }}>
        <Text
          accessibilityRole="header"
          style={[typography.body, { color: colors.text, fontWeight: "700" }]}
        >
          {t("guidelines.title")}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>{t("guidelines.intro")}</Text>
        {(["rule1", "rule2", "rule3", "rule4"] as const).map((rule) => (
          <Text key={rule} style={[typography.body, { color: colors.text }]}>
            • {t(`guidelines.${rule}`)}
          </Text>
        ))}
        <Text style={[typography.body, { color: colors.textMuted }]}>{t("guidelines.outro")}</Text>
      </View>

      <Controller
        control={control}
        name="guidelinesAccepted"
        render={({ field }) => (
          <Checkbox
            label={t("onboarding.acceptGuidelines")}
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {submitError ? (
        <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.danger }]}>
          {submitError}
        </Text>
      ) : null}

      <Button
        label={complete.isPending ? t("onboarding.submitting") : t("onboarding.submit")}
        disabled={!canSubmit}
        loading={complete.isPending}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
