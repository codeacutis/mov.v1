// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Viagens from "./Viagens";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("envia filtros ao servidor, mostra nome do veículo e permite remover os rótulos", async () => {
  const fetch = vi.fn(async (url: string) => {
    const parsed = new URL(url);
    const data =
      parsed.pathname === "/auth/me"
        ? { name: "Admin fictício", role: "ADMIN" }
        : {
            data:
              parsed.pathname === "/vehicles"
                ? [{ id: "v1", plate: "TST0001", description: "Van municipal" }]
                : parsed.pathname === "/drivers"
                  ? [{ id: "d1", user: { name: "Motorista fictício" } }]
                  : [
                      {
                        id: "t1",
                        status: "SCHEDULED",
                        plannedDepartureAt: "2099-01-01T06:00:00Z",
                        municipalPickupPoint: "Terminal fictício",
                        vehicle: {
                          id: "v1",
                          plate: "TST0001",
                          description: "Van municipal",
                        },
                        driver: {
                          id: "d1",
                          user: { name: "Motorista fictício" },
                        },
                      },
                    ],
            total: 1,
            page: 1,
            limit: 20,
          };
    return { ok: true, status: 200, json: async () => data };
  });
  vi.stubGlobal("fetch", fetch);
  render(<Viagens onNavegar={vi.fn()} onSair={vi.fn()} />);
  await screen.findByText("Van municipal", { selector: "strong" });
  expect(screen.getByText("Admin fictício")).toBeTruthy();
  expect(screen.queryByText("Operação")).toBeNull();
  fireEvent.change(screen.getByLabelText("Filtrar situação"), {
    target: { value: "SCHEDULED" },
  });
  fireEvent.change(screen.getByLabelText("Filtrar veículo"), {
    target: { value: "v1" },
  });
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(
        ([url]) =>
          new URL(url).searchParams.get("status") === "SCHEDULED" &&
          new URL(url).searchParams.get("vehicleId") === "v1",
      ),
    ).toBe(true),
  );
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  await waitFor(() =>
    expect(
      new URL(fetch.mock.calls.at(-1)![0]).searchParams.has("status"),
    ).toBe(false),
  );
  expect(
    (screen.getByLabelText("Filtrar veículo") as HTMLSelectElement).value,
  ).toBe("");
});
