import { useQuery } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { createTestQueryClient, renderWithProviders, TestProviders } from "@/test/helpers";

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

  it("keeps showing loaded data with a note when a refresh fails", async () => {
    const client = createTestQueryClient();
    const load = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce(["old"])
      .mockRejectedValueOnce(new Error("boom"));
    await render(
      <TestProviders client={client}>
        <Probe load={load} />
      </TestProviders>,
    );
    expect(await screen.findByText("old")).toBeTruthy();

    await act(async () => {
      await client.refetchQueries({ queryKey: ["probe"] });
    });

    expect(await screen.findByText("Kunne ikke oppdatere. Viser sist hentede data.")).toBeTruthy();
    expect(screen.getByText("old")).toBeTruthy();
    expect(screen.queryByText("Noe gikk galt")).toBeNull();
  });
});
