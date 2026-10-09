import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useBlock, useFollow, useUnfollow } from "@/features/social/hooks";
import { spacing, useColors, useTypography } from "@/theme";
import { Avatar, Button, ConfirmDialog, ErrorText, MessageState } from "@/theme/components";

import type { UserProfile } from "../types";

/** PROF-1 and PROF-5: header for everyone, content only when the server allows it. */
export function ProfileView({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
        <Avatar name={profile.displayName} size={72} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
            {profile.displayName}
          </Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>@{profile.username}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" }}>
        <Text style={[typography.body, { color: colors.text }]}>
          {t("profile.followersCount", { count: profile.followerCount })}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>
          {t("profile.followingCount", { count: profile.followingCount })}
        </Text>
        {profile.isPrivate ? (
          <Text style={[typography.body, { color: colors.textMuted }]}>{t("profile.private")}</Text>
        ) : null}
      </View>

      {profile.bio ? (
        <Text style={[typography.body, { color: colors.text }]}>{profile.bio}</Text>
      ) : null}

      {profile.isOwn ? <OwnActions /> : <OtherActions profile={profile} />}

      {profile.canViewContent ? (
        <View style={{ gap: spacing.md }}>
          <Text
            accessibilityRole="header"
            style={[typography.body, { color: colors.text, fontWeight: "700" }]}
          >
            {t("profile.statsTitle")}
          </Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            {t("profile.statsEmpty")}
          </Text>
          <Text
            accessibilityRole="header"
            style={[typography.body, { color: colors.text, fontWeight: "700" }]}
          >
            {t("profile.postsTitle")}
          </Text>
          <MessageState title={t("profile.postsEmptyTitle")} body={t("profile.postsEmptyBody")} />
        </View>
      ) : (
        <MessageState title={t("profile.privateTitle")} body={t("profile.privateBody")} />
      )}
    </View>
  );
}

function OwnActions() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: spacing.sm }}>
      <Button label={t("profile.edit")} onPress={() => router.push("/edit-profile")} />
      <Button
        variant="secondary"
        label={t("profile.settings")}
        onPress={() => router.push("/settings")}
      />
    </View>
  );
}

function OtherActions({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const follow = useFollow();
  const unfollow = useUnfollow();
  const block = useBlock();
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const busy = follow.isPending || unfollow.isPending;

  return (
    <View style={{ gap: spacing.sm }}>
      {profile.followState === "none" ? (
        <Button
          label={profile.isPrivate ? t("profile.followPrivate") : t("profile.follow")}
          loading={follow.isPending}
          disabled={busy}
          onPress={() => follow.mutate(profile.id)}
        />
      ) : profile.followState === "pending" ? (
        <>
          <FollowStatus text={t("profile.requested")} />
          <Button
            variant="secondary"
            label={t("profile.cancelRequest")}

            loading={unfollow.isPending}
            disabled={busy}
            onPress={() => unfollow.mutate(profile.id)}
          />
        </>
      ) : (
        <>
          <FollowStatus text={t("profile.following")} />
          <Button
            variant="secondary"
            label={t("profile.unfollow")}
            loading={unfollow.isPending}
            disabled={busy}
            onPress={() => unfollow.mutate(profile.id)}
          />
        </>
      )}
      <Button
        variant="secondary"
        label={t("profile.block")}
        onPress={() => setConfirmingBlock(true)}
      />
      <ErrorText visible={follow.isError || unfollow.isError || block.isError} />
      <ConfirmDialog
        visible={confirmingBlock}
        title={t("profile.blockConfirmTitle", { username: profile.username })}
        message={t("profile.blockConfirmMessage")}
        confirmLabel={t("profile.blockConfirm")}
        cancelLabel={t("common.cancel")}
        destructive
        onCancel={() => setConfirmingBlock(false)}
        onConfirm={() => {
          setConfirmingBlock(false);
          block.mutate(profile.id);
        }}
      />
    </View>
  );
}

function FollowStatus({ text }: { text: string }) {
  const colors = useColors();
  const typography = useTypography();
  return <Text style={[typography.body, { color: colors.textMuted }]}>{text}</Text>;
}
