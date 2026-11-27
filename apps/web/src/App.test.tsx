// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App";
import { saveAccessToken } from "./services/api";

vi.mock("./pages/Painel/Painel", () => ({
  default: () => <p>Painel ADMIN</p>,
}));
vi.mock("./pages/Viagens/Viagens", () => ({
  default: () => <p>Viagens ADMIN</p>,
}));
vi.mock("./pages/AgendaFrota/AgendaFrota", () => ({ default: () => null }));
vi.mock("./pages/CadastroVeiculo/CadastroVeiculo", () => ({
  default: () => null,
}));
vi.mock("./pages/CadastroMotorista/CadastroMotorista", () => ({
  default: () => null,
}));
vi.mock("./pages/CadastroPassageiro/CadastroPassageiro", () => ({
  default: () => null,
}));
vi.mock("./pages/Relatorios/Relatorios", () => ({ default: () => null }));

const response = (status: number, body?: unknown) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
describe("Navegação e restauração da sessão por perfil", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  function useIdentity(role = "MOTORISTA") {
    const fetch = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (path === "/auth/me")
        return response(200, {
          id: "ficticio",
          name: "Motorista fictício",
          role,
        });
      if (path === "/auth/login")
        return response(200, { accessToken: "sessao-ficticia" });
      if (path === "/driver/trips") return response(200, []);
      throw new Error(`Endpoint inesperado: ${path}`);
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }
  async function login() {
    fireEvent.change(await screen.findByLabelText("E-mail"), {
      target: { value: "pessoa@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-ficticia" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  }
  it("autentica MOTORISTA e abre somente a área operacional", async () => {
    const fetch = useIdentity();
    render(<App />);
    await login();
    await screen.findByRole("heading", { name: "Olá, Motorista fictício" });
    expect(screen.queryByText("Painel ADMIN")).toBeNull();
    expect(
      fetch.mock.calls.every(
        ([url]) =>
          !/\/(patients|trips|analytics|drivers)$/.test(
            new URL(url).pathname.replace("/driver/trips", ""),
          ),
      ),
    ).toBe(true);
  });
  it("autentica ADMIN e abre o painel administrativo", async () => {
    useIdentity("ADMIN");
    render(<App />);
    await login();
    await screen.findByText("Painel ADMIN");
    expect(screen.queryByText("Mov+ · Área do motorista")).toBeNull();
  });
  it("restaura sessão persistente com /auth/me sem decodificar papel do token", async () => {
    saveAccessToken("token-opaco-ficticio", true);
    const fetch = useIdentity();
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain(
      "Verificando sessão",
    );
    await screen.findByRole("heading", { name: "Olá, Motorista fictício" });
    expect(new URL(fetch.mock.calls[0][0]).pathname).toBe("/auth/me");
  });
  it("remove sessão inválida e volta ao login sem renderizar o painel", async () => {
    saveAccessToken("sessao-revogada-ficticia", false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(401, { message: "Sessão revogada" })),
    );
    render(<App />);
    await screen.findByRole("button", { name: "Entrar" });
    expect(sessionStorage.getItem("mov.accessToken")).toBeNull();
    expect(screen.queryByText("Painel ADMIN")).toBeNull();
  });
  it("mantém sessão em falha de rede e oferece nova tentativa sem liberar telas", async () => {
    saveAccessToken("sessao-ficticia", true);
    const fetch = useIdentity();
    fetch.mockRejectedValueOnce(new TypeError("offline"));
    render(<App />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "acessar a API",
    );
    expect(localStorage.getItem("mov.accessToken")).toBe("sessao-ficticia");
    expect(screen.queryByText("Painel ADMIN")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("heading", { name: "Olá, Motorista fictício" });
  });
  it("recusa perfil desconhecido na restauração", async () => {
    saveAccessToken("sessao-ficticia", false);
    useIdentity("OUTRO");
    render(<App />);
    await screen.findByRole("button", { name: "Entrar" });
    expect(sessionStorage.getItem("mov.accessToken")).toBeNull();
    expect(screen.queryByText("Painel ADMIN")).toBeNull();
  });
  it("revalida alterações de sessão persistente em outra aba", async () => {
    saveAccessToken("sessao-ficticia", true);
    const fetch = useIdentity();
    render(<App />);
    await screen.findByRole("heading", { name: "Olá, Motorista fictício" });
    fetch.mockResolvedValueOnce(
      response(200, { id: "admin", name: "Admin fictício", role: "ADMIN" }),
    );
    localStorage.setItem("mov.accessToken", "outra-sessao-ficticia");
    fireEvent(window, new StorageEvent("storage", { key: "mov.accessToken" }));
    await screen.findByText("Painel ADMIN");
    expect(screen.queryByText("Mov+ · Área do motorista")).toBeNull();
  });
  it("desconecta quando um endpoint protegido retorna 401", async () => {
    saveAccessToken("sessao-ficticia", false);
    const fetch = useIdentity();
    fetch
      .mockResolvedValueOnce(
        response(200, {
          id: "driver",
          name: "Motorista fictício",
          role: "MOTORISTA",
        }),
      )
      .mockResolvedValueOnce(response(401, { message: "Sessão expirada" }));
    render(<App />);
    await screen.findByRole("button", { name: "Entrar" });
    await waitFor(() =>
      expect(sessionStorage.getItem("mov.accessToken")).toBeNull(),
    );
  });
});
