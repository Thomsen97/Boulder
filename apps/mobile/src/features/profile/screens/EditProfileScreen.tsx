import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ApiError } from "@/lib/api/errors";
import { spacing, useColors, useTypography } from "@/theme";
import { Avatar, AsyncView, Button, Screen, TextField } from "@/theme/components";

import { UsernameField } from "../components/UsernameField";
import { useMe, useUpdateMe, useUsernameAvailability } from "../hooks";
import { BIO_MAX, editProfileSchema, type EditProfileForm } from "../schemas";
import type { Me } from "../types";
import { nextUsernameChangeAt, normalizeUsername } from "../username";

export function EditProfileScreen() {
  const { t } = useTranslation();
  const query = useMe();

  return (
    <Screen back title={t("editProfile.title")}>
      <AsyncView query={query}>{(me) => <EditProfileFields me={me} />}</AsyncView>
    </Screen>
  );
}

function EditProfileFields({ me }: { me: Me }) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const update = useUpdateMe();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reopensAt = nextUsernameChangeAt(me.usernameChangedAt, new Date());

  const { control, handleSubmit, setError, formState } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    mode: "onChange",
    defaultValues: { username: me.username, displayName: me.displayName, bio: me.bio },
  });
  const username = useWatch({ control, name: "username" });
  const bio = useWatch({ control, name: "bio" });
  const availability = useUsernameAvailability(username, me.username);
  const unchanged = normalizeUsername(username) === me.username;

  const canSave =
    formState.isValid &&
    (availability === "available" || unchanged) &&
    (formState.isDirty || !unchanged) &&
    !update.isPending;

  const save = handleSubmit((values) => {
    setSubmitError(null);
    update.mutate(
      {
        displayName: values.displayName.trim(),
        bio: values.bio.trim(),
        ...(unchanged ? {} : { username: values.username }),
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          if (error instanceof ApiError && error.code === "username_taken") {
            setError("username", { message: "editProfile.usernameTaken" });
          } else {
            setSubmitError(t("editProfile.saveError"));
          }
        },
      },
    );
  });

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Avatar name={me.displayName} size={88} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {t("editProfile.avatarLater")}
        </Text>
      </View>

      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label={t("editProfile.displayNameLabel")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={60}
            error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="username"
        render={({ field, fieldState }) => (
          <UsernameField
            label={t("editProfile.usernameLabel")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            availability={availability}
            unchanged={unchanged}
            errorKey={fieldState.error?.message}
            editable={!reopensAt}
            hint={
              reopensAt
                ? t("editProfile.usernameLocked", {
                    date: reopensAt.toLocaleDateString(i18n.language),
                  })
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <TextField
            label={t("editProfile.bioLabel")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            autoCapitalize="sentences"
            hint={t("editProfile.bioCounter", { count: bio.length })}
            error={
              fieldState.error?.message
                ? t(fieldState.error.message)
                : bio.length > BIO_MAX
                  ? t("profile.error.bioTooLong")
                  : undefined
            }
          />
        )}
      />

      {submitError ? (
        <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.danger }]}>
          {submitError}
        </Text>
      ) : null}

      <Button
        label={update.isPending ? t("common.saving") : t("common.save")}
        disabled={!canSave}
        loading={update.isPending}
        onPress={() => void save()}
      />
    </View>
  );
}
