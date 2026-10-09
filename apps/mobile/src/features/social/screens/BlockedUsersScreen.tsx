import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";
import { Avatar, AsyncView, Button, ErrorText, Screen } from "@/theme/components";

import { useBlocks, useUnblock } from "../hooks";

/** SAFE-1: the only place a blocked user is still visible, so the block can be lifted. */
export function BlockedUsersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const query = useBlocks();
  const unblock = useUnblock();

  return (
    <Screen back title={t("blocked.title")}>
      <AsyncView
        query={query}
        isEmpty={(people) => people.length === 0}
        empty={{ title: t("blocked.emptyTitle"), body: t("blocked.emptyBody") }}
      >
        {(people) => (
          <View style={{ gap: spacing.md }}>
            <ErrorText visible={unblock.isError} />
            {people.map((person) => (
              <View
                key={person.id}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
              >
                <Avatar name={person.displayName} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>
                    {person.displayName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    @{person.username}
                  </Text>
                </View>
                <Button
                  variant="secondary"
                  label={t("blocked.unblock")}
                  accessibilityLabel={t("blocked.unblockFor", { name: person.displayName })}
                  disabled={unblock.isPending}
                  onPress={() => unblock.mutate(person.id)}
                />
              </View>
            ))}
          </View>
        )}
      </AsyncView>
    </Screen>
  );
}
