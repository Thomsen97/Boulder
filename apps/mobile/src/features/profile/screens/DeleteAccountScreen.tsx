import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { hasRecentSignIn, useSession } from "@/features/session/store";
import { spacing, useColors, useTypography } from "@/theme";
import { AsyncView, Button, MessageState, Screen, TextField } from "@/theme/components";

import { useDeleteAccount, useMe } from "../hooks";
import type { Me } from "../types";
import { normalizeUsername } from "../username";

export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const query = useMe();

  return (
    <Screen back title={t("deleteAccount.title")}>
      <AsyncView query={query}>{(me) => <DeleteAccountContent me={me} />}</AsyncView>
    </Screen>
  );
}

/** DEL-1 (UI only): recent sign-in, then typing the username. The purge itself is phase 3. */
function DeleteAccountContent({ me }: { me: Me }) {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const { lastSignInAt, signIn, signOut } = useSession();
  const remove = useDeleteAccount();
  const [typed, setTyped] = useState("");

  if (!hasRecentSignIn(lastSignInAt, new Date())) {
    return (
      <MessageState
        title={t("deleteAccount.reauthTitle")}
        body={t("deleteAccount.reauthBody")}
        action={{ label: t("deleteAccount.reauthButton"), onPress: () => signIn() }}
      />
    );
  }

  const matches = normalizeUsername(typed) === me.username;

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={[typography.body, { color: colors.text }]}>{t("deleteAccount.warning")}</Text>
      <TextField
        label={t("deleteAccount.usernameLabel")}
        hint={t("deleteAccount.typeUsername", { username: me.username })}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {remove.isError ? (
        <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.danger }]}>
          {t("deleteAccount.error")}
        </Text>
      ) : null}
      <Button
        variant="danger"
        label={remove.isPending ? t("deleteAccount.deleting") : t("deleteAccount.confirm")}
        disabled={!matches}
        loading={remove.isPending}
        onPress={() => remove.mutate(typed, { onSuccess: () => signOut() })}
      />
    </View>
  );
}
