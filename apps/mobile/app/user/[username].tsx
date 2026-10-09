import { useLocalSearchParams } from "expo-router";

import { UserProfileScreen } from "@/features/profile/screens/UserProfileScreen";

export default function UserRoute() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <UserProfileScreen username={username} />;
}
