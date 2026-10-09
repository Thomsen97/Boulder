import { useQuery } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/helpers";

import { AsyncView } from "./StateView";

function Probe({ load }: { load: () => Promise<string[]> }) {
  const query = useQuery({ queryKey: ["probe"], queryFn: load });
  return (
    <AsyncView
      query={query}
      isEmpty={(items) => items.length === 0}
      empty={{ title: "Tomt", body: "Ingenting her" }}
    >
      {(items) => <Text>{items.join(",")}</Text>}
    </AsyncView>
  );
}

describe("AsyncView", () => {
  it("shows loading, then the data", async () => {
    let resolve: (items: string[]) => void = () => {};
    const load = () => new Promise<string[]>((r) => (resolve = r));
    await renderWithProviders(<Probe load={load} />);

    expect(screen.getByRole("progressbar")).toBeTruthy();
    resolve(["a", "b"]);
    expect(await screen.findByText("a,b")).toBeTruthy();
  });

  it("shows the empty state for empty data", async () => {
    await renderWithProviders(<Probe load={async () => []} />);

    expect(await screen.findByText("Tomt")).toBeTruthy();
    expect(screen.getByText("Ingenting her")).toBeTruthy();
  });

  it("shows the error state and retries", async () => {
    const load = jest
      .fn<Promise<string[]>, []>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(["ok"]);
    await renderWithProviders(<Probe load={load} />);

    expect(await screen.findByText("Noe gikk galt")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await screen.findByText("ok")).toBeTruthy();
  });
});
