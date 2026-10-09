import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { spacing, useColors, useTypography } from "@/theme";

import { Button } from "./Button";

interface MessageProps {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

/** Centered message used for empty and error states. */
export function MessageState({ title, body, action }: MessageProps) {
  const colors = useColors();
  const typography = useTypography();
  return (
    <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}>
      <Text
        accessibilityRole="header"
        style={[typography.body, { color: colors.text, fontWeight: "600", textAlign: "center" }]}
      >
        {title}
      </Text>
      {body ? (
        <Text style={[typography.body, { color: colors.textMuted, textAlign: "center" }]}>
          {body}
        </Text>
      ) : null}
      {action ? <Button variant="secondary" label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

export function LoadingState() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  return (
    <View
      accessible
      accessibilityLabel={t("common.loading")}
      accessibilityRole="progressbar"
      style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}
    >
      <ActivityIndicator color={colors.primary} />
      <Text style={[typography.caption, { color: colors.textMuted }]}>{t("common.loading")}</Text>
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <MessageState
      title={t("common.errorTitle")}
      body={t("common.errorBody")}
      action={{ label: t("common.retry"), onPress: onRetry }}
    />
  );
}

interface AsyncViewProps<T> {
  query: UseQueryResult<T>;
  /** Return true when the loaded data should show the empty state. */
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; body?: string };
  /** Shown instead of the generic error for specific failures, such as a 404. */
  errorOverride?: (error: unknown) => ReactNode | null;
  children: (data: T) => ReactNode;
}

/** Renders the loading, error, empty and loaded states of a query in one place. */
export function AsyncView<T>({
  query,
  isEmpty,
  empty,
  errorOverride,
  children,
}: AsyncViewProps<T>) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return errorOverride?.(query.error) ?? <ErrorState onRetry={() => void query.refetch()} />;
  }
  if (isEmpty?.(query.data) && empty) return <MessageState {...empty} />;
  return <>{children(query.data)}</>;
}
