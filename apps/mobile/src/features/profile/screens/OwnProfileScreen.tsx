import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";

import { useColors } from "@/theme";
import { AsyncView, Screen } from "@/theme/components";

import { ProfileView } from "../components/ProfileView";
import { useOwnProfile } from "../hooks";

/** The Profil tab: PROF-1 and PROF-7 (posts with audience badges come with the feed phase). */
export function OwnProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const query = useOwnProfile();

  return (
    <Screen
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("profile.settings")}
          onPress={() => router.push("/settings")}
          hitSlop={8}
          style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="settings-outline" size={26} color={colors.text} />
        </Pressable>
      }
      title={t("tabs.profile")}
    >
      <AsyncView query={query}>{(profile) => <ProfileView profile={profile} />}</AsyncView>
    </Screen>
  );
}
