import { useTranslation } from "react-i18next";

import { PlaceholderScreen } from "@/features/PlaceholderScreen";

export function GroupsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t("tabs.groups")} body={t("placeholder.groups")}></PlaceholderScreen>
  );
}
