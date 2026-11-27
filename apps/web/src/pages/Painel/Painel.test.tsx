// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Painel from "./Painel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("exibe totais do servidor e listas de cadastro sem depender de indicadores por período", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      const body =
        path === "/auth/me"
          ? { name: "Admin fictício", role: "ADMIN" }
          : {
              data:
                path === "/vehicles"
                  ? [
                      {
                        id: "v1",
                        description: "Van fictícia",
                        plate: "TST0001",
                        capacity: 8,
                        status: "ACTIVE",
                      },
                    ]
                  : path === "/drivers"
                    ? [
                        {
                          id: "d1",
                          user: { name: "Motorista fictício" },
                          isActive: true,
                        },
                      ]
                    : [],
              total: path === "/patients" ? 42 : 12,
              page: 1,
              limit: 5,
            };
      return { ok: true, status: 200, json: async () => body };
    }),
  );
  render(<Painel onNavegar={vi.fn()} onSair={vi.fn()} />);
  expect(
    (await screen.findByRole("button", { name: /Pacientes cadastrados/ }))
      .textContent,
  ).toContain("42");
  expect(screen.getByText("Van fictícia")).toBeTruthy();
  expect(screen.getByText("Motorista fictício")).toBeTruthy();
  expect(screen.queryByLabelText("Início do período")).toBeNull();
});
