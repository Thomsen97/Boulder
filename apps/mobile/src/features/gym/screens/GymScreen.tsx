import { useTranslation } from "react-i18next";

import { PlaceholderScreen } from "@/features/PlaceholderScreen";

export function GymScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t("tabs.gym")} body={t("placeholder.gym")}></PlaceholderScreen>;
}
