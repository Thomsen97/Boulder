import { useTranslation } from "react-i18next";

import { isNotFound } from "@/lib/api/errors";
import { AsyncView, MessageState, Screen } from "@/theme/components";

import { ProfileView } from "../components/ProfileView";
import { useProfile } from "../hooks";

/**
 * Another user's profile. A blocked pair gets the same 404 as a missing user (SAFE-1, 5.6),
 * so both end up on the same "not found" state.
 */
export function UserProfileScreen({ username }: { username: string }) {
  const { t } = useTranslation();
  const query = useProfile(username);

  return (
    <Screen back>
      <AsyncView
        query={query}
        errorOverride={(error) =>
          isNotFound(error) ? (
            <MessageState title={t("common.notFoundTitle")} body={t("common.notFoundBody")} />
          ) : null
        }
      >
        {(profile) => <ProfileView profile={profile} />}
      </AsyncView>
    </Screen>
  );
}
