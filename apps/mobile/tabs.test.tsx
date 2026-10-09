import { renderRouter, screen } from "expo-router/testing-library";

import nb from "@/i18n/nb.json";
import { signInOnboarded } from "@/test/helpers";

describe("tab shell", () => {
  it("shows the five tabs with labels from nb.json", async () => {
    signInOnboarded();
    await renderRouter("./app", { initialUrl: "/" });
    for (const label of Object.values(nb.tabs)) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
    }
    expect(Object.values(nb.tabs)).toEqual(["Hjem", "Grupper", "Gym", "Varsler", "Profil"]);
  });
});
