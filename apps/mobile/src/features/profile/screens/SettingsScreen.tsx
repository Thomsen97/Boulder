import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useSession } from "@/features/session/store";
import { spacing, useColors, useTypography } from "@/theme";
import { AsyncView, Button, ConfirmDialog, ListRow, Screen, SwitchRow } from "@/theme/components";

import { MockProfilesSection } from "../components/MockProfilesSection";
import { useMe, useUpdateMe } from "../hooks";
import type { Me, SpoilerMode } from "../types";

export function SettingsScreen() {
  const { t } = useTranslation();
  const query = useMe();

  return (
    <Screen back title={t("settings.title")}>
      <AsyncView query={query}>{(me) => <SettingsContent me={me} />}</AsyncView>
    </Screen>
  );
}

const SPOILER_MODES: { mode: SpoilerMode; label: string; hint?: string }[] = [
  { mode: "off", label: "settings.spoilerOff" },
  { mode: "projects", label: "settings.spoilerProjects", hint: "settings.spoilerProjectsHint" },
  { mode: "all_unsent", label: "settings.spoilerAll" },
];

function SettingsContent({ me }: { me: Me }) {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const update = useUpdateMe();
  const signOut = useSession((s) => s.signOut);
  const [confirmingPublic, setConfirmingPublic] = useState(false);

  return (
    <View style={{ gap: spacing.lg }}>
      {update.isError ? (
        <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.danger }]}>
          {t("settings.saveError")}
        </Text>
      ) : null}

      <Section title={t("settings.privacySection")}>
        <SwitchRow
          label={t("settings.privateProfile")}
          description={t("settings.privateProfileHint")}
          value={me.isPrivate}
          onValueChange={(value) => {
            // 5.6: going public makes every profile post visible, so it needs a confirmation.
            if (!value) setConfirmingPublic(true);
            else update.mutate({ isPrivate: true });
          }}
        />
        <SwitchRow
          label={t("settings.shareAscents")}
          description={t("settings.shareAscentsHint")}
          value={me.shareAscents}
          onValueChange={(value) => update.mutate({ shareAscents: value })}
        />
      </Section>

      <Section title={t("settings.spoilerSection")} description={t("settings.spoilerHint")}>
        {SPOILER_MODES.map(({ mode, label, hint }) => (
          <ListRow
            key={mode}
            role="radio"
            label={t(label)}
            description={hint ? t(hint) : undefined}
            selected={me.spoilerMode === mode}
            onPress={() => update.mutate({ spoilerMode: mode })}
          />
        ))}
      </Section>

      <Section title={t("settings.notificationsSection")}>
        <ListRow label={t("settings.notificationsLater")} disabled />
      </Section>

      <Section title={t("settings.peopleSection")}>
        <ListRow
          label={t("settings.followRequests")}
          onPress={() => router.push("/settings/follow-requests")}
        />
        <ListRow
          label={t("settings.blockedUsers")}
          onPress={() => router.push("/settings/blocked")}
        />
      </Section>

      <MockProfilesSection />

      <Section title={t("settings.accountSection")}>
        <Button variant="secondary" label={t("settings.signOut")} onPress={() => signOut()} />
        <Button
          variant="danger"
          label={t("settings.deleteAccount")}
          onPress={() => router.push("/settings/delete-account")}
        />
      </Section>

      <ConfirmDialog
        visible={confirmingPublic}
        title={t("settings.makePublicTitle")}
        message={t("settings.makePublicMessage")}
        confirmLabel={t("settings.makePublicConfirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmingPublic(false)}
        onConfirm={() => {
          setConfirmingPublic(false);
          update.mutate({ isPrivate: false });
        }}
      />
    </View>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const typography = useTypography();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={[typography.body, { color: colors.text, fontWeight: "700" }]}
      >
        {title}
      </Text>
      {description ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
}
