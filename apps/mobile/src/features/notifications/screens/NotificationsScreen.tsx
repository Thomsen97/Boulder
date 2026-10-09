import { useTranslation } from "react-i18next";

import { PlaceholderScreen } from "@/features/PlaceholderScreen";

export function NotificationsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t("tabs.notifications")}
      body={t("placeholder.notifications")}
    ></PlaceholderScreen>
  );
}
