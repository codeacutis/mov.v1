// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import AppMotorista from "./AppMotorista";

function fixture() {
  const patient = (id: string, name: string) => ({
    id,
    patient: {
      name,
      phone: "00000000000",
      usesWheelchair: true,
      hasReducedMobility: false,
      needsBoardingAssistance: true,
    },
    companions: [{ name: "Acompanhante fictício", phone: "00000000001" }],
    appointmentLocationName: "Estabelecimento fictício",
    appointmentAddress: "Rua de teste",
    appointmentMunicipality: "Município fictício",
    appointmentAt: "2099-01-01T10:00:00Z",
    outboundStatus: "PLANNED",
    returnStatus: "EXPECTED",
    outboundStopId: null,
    returnStopId: null,
  });
  const stop = (id: string, sequence: number, name: string) => ({
    id,
    sequence,
    name,
    direction: "RETURN",
    address: "Rua de teste",
    municipality: "Município fictício",
    stopType: "APPOINTMENT",
    plannedArrivalAt: null,
  });
  return {
    id: "trip-1",
    status: "SCHEDULED",
    municipalPickupPoint: "Terminal fictício",
    plannedDepartureAt: "2099-01-01T06:00:00Z",
    plannedReturnStartAt: "2099-01-01T18:00:00Z",
    actualDepartureAt: null as string | null,
    actualReturnStartAt: null as string | null,
    actualReturnAt: null as string | null,
    routeApprovedAt: "2098-12-30T12:00:00Z" as string | null,
    vehicle: { plate: "TST0001", description: "Van fictícia", capacity: 8 },
    _count: { patientTrips: 2 },
    patientTrips: [
      patient("part-1", "Paciente Alfa"),
      patient("part-2", "Paciente Beta"),
    ],
    stops: [
      stop("back-b", 2, "Segunda parada"),
      stop("back-a", 1, "Primeira parada"),
    ],
  };
}
describe("Portal operacional do motorista", () => {
  let trip: ReturnType<typeof fixture>;
  let mutations: {
    path: string;
    body: Record<string, string> | undefined;
    method: string;
  }[];
  const result = (status: number, body?: unknown) => ({
    ok: status < 400,
    status,
    json: async () => structuredClone(body),
  });
  beforeEach(() => {
    trip = fixture();
    mutations = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options: RequestInit = {}) => {
        const path = new URL(url).pathname;
        if (options.method && options.method !== "GET") {
          const body = options.body
            ? (JSON.parse(String(options.body)) as Record<string, string>)
            : undefined;
          mutations.push({ path, body, method: options.method });
          if (path.endsWith("/start")) {
            trip.status = "IN_PROGRESS";
            trip.actualDepartureAt = "2099-01-01T06:00:00Z";
          }
          if (path.endsWith("/start-return"))
            trip.actualReturnStartAt = "2099-01-01T18:00:00Z";
          if (path.endsWith("/complete")) {
            trip.status = "COMPLETED";
            trip.actualReturnAt = "2099-01-01T20:00:00Z";
          }
          const item = trip.patientTrips.find((p) => path.includes(p.id));
          if (item && path.endsWith("/outbound-status"))
            item.outboundStatus = body!.status;
          if (item && path.endsWith("/return-status"))
            item.returnStatus = body!.status;
          return result(204);
        }
        if (path === "/driver/trips") return result(200, [trip]);
        if (path === "/driver/trips/trip-1") return result(200, trip);
        throw new Error(`Endpoint inesperado: ${path}`);
      }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  const show = async () => {
    render(<AppMotorista userName="Motorista fictício" onSair={vi.fn()} />);
    await screen.findByRole("heading", { name: "Terminal fictício" });
  };
  const participant = (name = "Paciente Alfa") =>
    within(screen.getByRole("article", { name: `Participação de ${name}` }));
  const click = async (
    name: string,
    scope: Pick<typeof screen, "findByRole"> = screen,
  ) => {
    const button = await scope.findByRole("button", { name });
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(button);
  };
  const form = () =>
    screen.getByRole("region", { name: "Registro operacional" });

  it("consulta somente endpoints operacionais e preserva a ordem aprovada do retorno", async () => {
    await show();
    expect(screen.queryByRole("navigation", { name: "Principal" })).toBeNull();
    const route = screen.getByRole("list", { name: "Paradas do retorno" });
    expect(
      within(route)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("Segunda parada"),
      expect.stringContaining("Primeira parada"),
    ]);
    expect(
      screen
        .getAllByRole("link", { name: "00000000000" })[0]
        .getAttribute("href"),
    ).toBe("tel:00000000000");
    expect(participant().getByText("Utiliza cadeira de rodas")).toBeTruthy();
    expect(screen.getByText(/Capacidade: 8/).textContent).toContain(
      "Acompanhantes: 2",
    );
    for (const [url] of vi.mocked(fetch).mock.calls)
      expect(new URL(String(url)).pathname).toMatch(/^\/driver\/trips/);
  });

  it("executa ida e retorno, recarrega os estados e envia horários somente por ação", async () => {
    await show();
    expect(
      screen.queryByRole("button", { name: "Iniciar retorno" }),
    ).toBeNull();
    await click("Iniciar viagem");
    await click("Registrar embarque na ida", participant());
    await waitFor(() =>
      expect(participant().getByText("Embarcou na ida")).toBeTruthy(),
    );
    await click("Registrar ausência na ida", participant("Paciente Beta"));
    await click("Iniciar retorno");
    await click("Registrar embarque no retorno", participant());
    await waitFor(() =>
      expect(participant().getByText("Embarcou no retorno")).toBeTruthy(),
    );
    await click("Concluir viagem");
    await screen.findByText("Concluída", { selector: "strong" });
    expect(
      screen.queryByRole("button", { name: "Registrar ocorrência" }),
    ).toBeNull();
    expect(mutations.map((item) => item.path)).toEqual([
      "/driver/trips/trip-1/start",
      "/driver/trips/trip-1/participants/part-1/outbound-status",
      "/driver/trips/trip-1/participants/part-2/outbound-status",
      "/driver/trips/trip-1/start-return",
      "/driver/trips/trip-1/participants/part-1/return-status",
      "/driver/trips/trip-1/complete",
    ]);
    expect(
      mutations
        .filter((item) => !item.path.includes("participants"))
        .every((item) => item.body === undefined),
    ).toBe(true);
  });

  it("registra não retorno com motivo, preservando o embarque da ida", async () => {
    trip.status = "IN_PROGRESS";
    trip.patientTrips[0].outboundStatus = "BOARDED";
    await show();
    await click("Informar que não retornará", participant());
    fireEvent.change(within(form()).getByLabelText("Motivo / justificativa"), {
      target: { value: "Retorno com familiar fictício" },
    });
    await click("Salvar registro", within(form()));
    await waitFor(() =>
      expect(participant().getByText("Avisou que não retornará")).toBeTruthy(),
    );
    expect(participant().getByText("Embarcou na ida")).toBeTruthy();
    expect(mutations[0].body).toEqual({
      status: "NOT_RETURNING",
      reason: "Retorno com familiar fictício",
    });
  });

  it("exige tentativa de contato e justificativa para registrar ausência no retorno", async () => {
    trip.status = "IN_PROGRESS";
    trip.actualReturnStartAt = "2099-01-01T18:00:00Z";
    await show();
    expect(
      participant().queryByRole("button", {
        name: "Registrar embarque no retorno",
      }),
    ).toBeNull();
    await click("Registrar ausência no retorno", participant());
    fireEvent.change(within(form()).getByLabelText("Motivo / justificativa"), {
      target: { value: "Ausente no estabelecimento fictício" },
    });
    fireEvent.submit(form().querySelector("form")!);
    expect(mutations).toHaveLength(0);
    expect(within(form()).getByRole("alert").textContent).toContain(
      "campos obrigatórios",
    );
    fireEvent.change(
      within(form()).getByLabelText("Tentativa de contato realizada"),
      { target: { value: "Ligação sem resposta fictícia" } },
    );
    await click("Salvar registro", within(form()));
    await waitFor(() => expect(mutations).toHaveLength(1));
    expect(mutations[0].body).toEqual({
      status: "NO_SHOW",
      reason: "Ausente no estabelecimento fictício",
      contactAttempt: "Ligação sem resposta fictícia",
    });
  });

  it("registra tentativa de contato vinculada e ocorrência geral pelos DTOs existentes", async () => {
    trip.status = "IN_PROGRESS";
    await show();
    await click("Registrar tentativa de contato", participant());
    fireEvent.change(within(form()).getByLabelText("Descrição do registro"), {
      target: { value: "Ligação fictícia" },
    });
    await click("Salvar registro", within(form()));
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Registro operacional" }),
      ).toBeNull(),
    );
    await click("Registrar ocorrência");
    fireEvent.change(within(form()).getByLabelText("Descrição do registro"), {
      target: { value: "Ocorrência fictícia" },
    });
    await click("Salvar registro", within(form()));
    await waitFor(() => expect(mutations).toHaveLength(2));
    expect(mutations.map((item) => item.body)).toEqual([
      {
        type: "CONTACT_ATTEMPT",
        description: "Ligação fictícia",
        patientTripId: "part-1",
      },
      { type: "INCIDENT", description: "Ocorrência fictícia" },
    ]);
    expect(mutations.every((item) => item.method === "POST")).toBe(true);
  });

  it("oculta início sem aprovação e não apresenta ações em viagem encerrada", async () => {
    trip.routeApprovedAt = null;
    await show();
    expect(screen.queryByRole("button", { name: "Iniciar viagem" })).toBeNull();
    expect(
      screen.queryByRole("list", { name: "Paradas do retorno" }),
    ).toBeNull();
    trip.status = "INTERRUPTED";
    await click("Atualizar viagens");
    await screen.findByText("Interrompida", { selector: "strong" });
    expect(
      screen.queryByRole("button", { name: "Registrar ocorrência" }),
    ).toBeNull();
  });

  it("mostra ausência de viagens e permite tentar novamente após erro de rede", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    render(<AppMotorista userName="Motorista fictício" onSair={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "acessar a API",
    );
    vi.mocked(fetch).mockResolvedValueOnce(result(200, []) as Response);
    await click("Atualizar viagens");
    await screen.findByText("Nenhuma viagem atribuída a você.");
  });

  it("exibe conflito do backend e atualiza a operação com o estado persistido", async () => {
    await show();
    vi.mocked(fetch).mockResolvedValueOnce(
      result(409, { message: "Rota aguardando nova aprovação." }) as Response,
    );
    trip.routeApprovedAt = null;
    await click("Iniciar viagem");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "nova aprovação",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Iniciar viagem" }),
      ).toBeNull(),
    );
  });
});
