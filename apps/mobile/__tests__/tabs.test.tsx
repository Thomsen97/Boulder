import { renderRouter, screen } from "expo-router/testing-library";

import nb from "@/i18n/nb.json";

describe("tab shell", () => {
  it("shows the five tabs with labels from nb.json", async () => {
    await renderRouter("./app", { initialUrl: "/" });
    for (const label of Object.values(nb.tabs)) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(Object.values(nb.tabs)).toEqual(["Hjem", "Grupper", "Gym", "Varsler", "Profil"]);
  });
});
