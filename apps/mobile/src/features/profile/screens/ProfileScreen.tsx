import { useTranslation } from "react-i18next";

import { PlaceholderScreen } from "@/features/PlaceholderScreen";

export function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t("tabs.profile")}
      body={t("placeholder.profile")}
    ></PlaceholderScreen>
  );
}
