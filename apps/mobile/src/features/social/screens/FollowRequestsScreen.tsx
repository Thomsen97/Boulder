import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";
import { Avatar, AsyncView, Button, Screen } from "@/theme/components";

import { useAcceptFollowRequest, useDeclineFollowRequest, useFollowRequests } from "../hooks";

/** PROF-3: requests to follow a private profile, accepted or declined by the target. */
export function FollowRequestsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const query = useFollowRequests();
  const accept = useAcceptFollowRequest();
  const decline = useDeclineFollowRequest();

  return (
    <Screen back title={t("followRequests.title")}>
      <AsyncView
        query={query}
        isEmpty={(requests) => requests.length === 0}
        empty={{ title: t("followRequests.emptyTitle"), body: t("followRequests.emptyBody") }}
      >
        {(requests) => (
          <View style={{ gap: spacing.md }}>
            {requests.map((person) => (
              <View key={person.id} style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <Avatar name={person.displayName} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>
                      {person.displayName}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      @{person.username}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t("followRequests.accept")}
                      accessibilityLabel={t("followRequests.acceptFor", {
                        name: person.displayName,
                      })}
                      disabled={accept.isPending || decline.isPending}
                      onPress={() => accept.mutate(person.id)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      label={t("followRequests.decline")}
                      accessibilityLabel={t("followRequests.declineFor", {
                        name: person.displayName,
                      })}
                      disabled={accept.isPending || decline.isPending}
                      onPress={() => decline.mutate(person.id)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </AsyncView>
    </Screen>
  );
}
