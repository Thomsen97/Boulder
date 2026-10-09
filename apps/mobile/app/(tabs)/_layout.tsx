import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tabs: { name: string; key: string; icon: IconName }[] = [
  { name: "index", key: "home", icon: "home-outline" },
  { name: "groups", key: "groups", icon: "people-outline" },
  { name: "gym", key: "gym", icon: "barbell-outline" },
  { name: "notifications", key: "notifications", icon: "notifications-outline" },
  { name: "profile", key: "profile", icon: "person-outline" },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      {tabs.map(({ name, key, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(`tabs.${key}`),
            tabBarAccessibilityLabel: t(`tabs.${key}`),
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
