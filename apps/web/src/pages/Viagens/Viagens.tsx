import "./Viagens.css";
import DetalhesViagem from "./DetalhesViagem";
import { useEffect, useRef, useState } from "react";
import AppLayout from "../../components/AppLayout";
import FormularioViagem from "../../components/FormularioViagem";
import GerenciarParadas from "../GerenciarParadas/GerenciarParadas";
import Paginacao from "../../components/Paginacao";
import { apiRequest, apiErrorMessage, fetchAllPages } from "../../services/api";
import { vehicleLabel } from "../../services/vehicle-label";
import { usePaginatedList } from "../../hooks/usePaginatedList";

interface ViagensProps {
  iniciarCriando?: boolean;
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus =
  "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "INTERRUPTED";

interface Trip {
  id: string;
  plannedDepartureAt: string;
  plannedReturnStartAt: string;
  municipalPickupPoint: string;
  status: TripStatus;
  vehicle: { id: string; plate: string; description?: string | null };
  driver: { id: string; user: { name: string } };
  _count?: { patientTrips: number };
}

const STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  INTERRUPTED: "Interrompida",
};

const STATUS_CLASS: Record<TripStatus, string> = {
  SCHEDULED: "status--info",
  IN_PROGRESS: "status--ok",
  COMPLETED: "status--ok",
  CANCELLED: "status--erro",
  INTERRUPTED: "status--alerta",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Viagens({
  iniciarCriando = false,
  onNavegar,
  onSair,
}: ViagensProps) {
  const [filters, setFilters] = useState({
    status: "",
    vehicleId: "",
    driverId: "",
  });
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  ).toString();
  const {
    data: trips,
    loading,
    error: listError,
    page,
    totalPages,
    q,
    search,
    goTo,
    reload,
  } = usePaginatedList<Trip>("/trips", 20, params);
  const [vehicles, setVehicles] = useState<
    { id: string; plate: string; description?: string | null }[]
  >([]);
  const [drivers, setDrivers] = useState<
    { id: string; user: { name: string } }[]
  >([]);
  const [filterError, setFilterError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchAllPages<{ id: string; plate: string; description?: string | null }>(
        "/vehicles",
        controller.signal,
      ),
      fetchAllPages<{ id: string; user: { name: string } }>(
        "/drivers",
        controller.signal,
      ),
    ])
      .then(([v, d]) => {
        if (!controller.signal.aborted) {
          setVehicles(v);
          setDrivers(d);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setFilterError(apiErrorMessage(cause));
      });
    return () => controller.abort();
  }, []);
  function changeFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    goTo(1);
  }
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [criando, setCriando] = useState(iniciarCriando);
  const [paradaTrip, setParadaTrip] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Trip | undefined>();
  const [operation, setOperation] = useState<{
    trip: Trip;
    kind: "cancel" | "interrupt";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operationDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = operationDialog.current;
    if (operation && dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.open = true;
    }
  }, [operation]);

  async function submitOperation(event: React.FormEvent) {
    event.preventDefault();
    if (!operation) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/trips/${operation.trip.id}/${operation.kind}`, {
        method: "PATCH",
        body: JSON.stringify({
          reason: reason.trim(),
          ...(operation.kind === "interrupt" ? { action: action.trim() } : {}),
        }),
      });
      setNotice(
        operation.kind === "cancel"
          ? "Viagem cancelada."
          : "Viagem interrompida.",
      );
      setOperation(null);
      reload();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const visiveis = trips;

  function navegar(item: string) {
    if (item === "Viagens") {
      setCriando(false);
      setNotice("");
    }
    onNavegar(item);
  }

  function aoConcluirFormulario(salvou: boolean, tripId?: string) {
    setCriando(false);
    setEditing(undefined);
    if (salvou) {
      if (!editing && tripId) setDetailsId(tripId);
      setNotice(
        editing ? "Viagem atualizada." : "Viagem cadastrada com sucesso.",
      );
      reload();
    }
  }

  return (
    <AppLayout ativo="Viagens" onNavegar={navegar} onSair={onSair}>
      {detailsId ? (
        <DetalhesViagem
          tripId={detailsId}
          onVoltar={() => {
            setDetailsId(null);
            reload();
          }}
        />
      ) : paradaTrip ? (
        <GerenciarParadas
          tripId={paradaTrip}
          onVoltar={() => {
            setParadaTrip(null);
            reload();
          }}
        />
      ) : criando || editing ? (
        <FormularioViagem
          key={editing?.id ?? "new"}
          trip={editing}
          onConcluir={aoConcluirFormulario}
        />
      ) : (
        <>
          <header className="cabecalho cabecalho--linha">
            <div>
              <h1>Viagens</h1>
              <p>Todas as viagens programadas e realizadas</p>
            </div>
            <div className="cabecalho__acoes">
              <button
                type="button"
                className="botao botao--primario"
                onClick={() => {
                  setNotice("");
                  setCriando(true);
                }}
              >
                Nova viagem
              </button>
            </div>
          </header>

          {notice && (
            <div className="aviso aviso--ok" role="status">
              {notice}
            </div>
          )}
          {error && !operation && (
            <div className="aviso aviso--erro" role="alert">
              {error}
            </div>
          )}
          {operation && (
            <dialog ref={operationDialog} className="viagem-operacao" aria-labelledby="operacao-titulo" aria-describedby="operacao-contexto" onCancel={event => { if (saving) event.preventDefault(); else { setOperation(null); setError(''); } }}>
            <form onSubmit={submitOperation}>
              <h2 id="operacao-titulo">
                {operation.kind === "cancel"
                  ? "Cancelar viagem"
                  : "Interromper viagem"}
              </h2>
              <p id="operacao-contexto" className="viagem-operacao__contexto"><strong>{operation.trip.municipalPickupPoint}</strong> · {formatDateTime(operation.trip.plannedDepartureAt)}<br />{vehicleLabel(operation.trip.vehicle)} · {operation.trip.driver?.user.name}</p>
              <p className="texto-suave">{operation.kind === 'cancel' ? 'O cancelamento preserva o histórico da viagem. Informe o motivo antes de confirmar.' : 'Registre o motivo e as providências adotadas para encerrar a operação interrompida.'}</p>
              {error && <div className="aviso aviso--erro" role="alert">{error}</div>}
              <fieldset disabled={saving}>
              <div className="campo"><label htmlFor="operacao-motivo">
                Motivo
              </label><textarea id="operacao-motivo" rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  maxLength={500}
                /><small className="texto-suave">{reason.length}/500 caracteres</small></div>
              {operation.kind === "interrupt" && (
                <div className="campo"><label htmlFor="operacao-providencias">
                  Providências
                </label><textarea id="operacao-providencias" rows={3}
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    required
                    maxLength={500}
                  /><small className="texto-suave">{action.length}/500 caracteres</small></div>
              )}
              <div className="acoes">
              <button type="button" className="botao botao--secundario" disabled={saving} onClick={() => { setOperation(null); setError(''); }}>Voltar</button>
              <button
                type="submit"
                className="botao botao--primario"
                disabled={
                  saving ||
                  !reason.trim() ||
                  (operation.kind === "interrupt" && !action.trim())
                }
              >
                {saving ? "Salvando…" : operation.kind === 'cancel' ? 'Confirmar cancelamento' : 'Confirmar interrupção'}
              </button>
              </div></fieldset>
            </form>
            </dialog>
          )}
          {listError && (
            <div className="aviso aviso--erro" role="alert">
              {listError}
            </div>
          )}

          <div className="filtros">
            <input
              type="search"
              maxLength={200}
              className="filtro"
              aria-label="Buscar por veículo, motorista ou local"
              placeholder="Buscar veículo, motorista ou local…"
              value={q}
              onChange={(e) => search(e.target.value)}
            />
            <label className="campo">
              Situação
              <select
                aria-label="Filtrar situação"
                value={filters.status}
                onChange={(e) => changeFilter("status", e.target.value)}
              >
                <option value="">Todas as situações</option>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              Veículo
              <select
                aria-label="Filtrar veículo"
                value={filters.vehicleId}
                onChange={(e) => changeFilter("vehicleId", e.target.value)}
              >
                <option value="">Todos os veículos</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {vehicleLabel(v)} · {v.plate}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              Motorista
              <select
                aria-label="Filtrar motorista"
                value={filters.driverId}
                onChange={(e) => changeFilter("driverId", e.target.value)}
              >
                <option value="">Todos os motoristas</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filterError && (
            <p role="alert">
              Não foi possível carregar as opções de filtro. {filterError}
            </p>
          )}
          <div className="filtros-ativos" aria-label="Filtros ativos">
            {q && (
              <button className="filtro-tag" onClick={() => search("")}>
                Busca: {q} <span aria-hidden="true">×</span>
                <span className="sr-only"> Remover busca</span>
              </button>
            )}
            {Object.entries(filters)
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <button
                  className="filtro-tag"
                  key={key}
                  onClick={() => changeFilter(key as keyof typeof filters, "")}
                >
                  {key === "status"
                    ? STATUS_LABEL[value as TripStatus]
                    : key === "vehicleId"
                      ? vehicleLabel(vehicles.find((v) => v.id === value))
                      : (drivers.find((d) => d.id === value)?.user.name ??
                        "Motorista")}{" "}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only"> Remover filtro</span>
                </button>
              ))}
            {(q || params) && (
              <button
                className="link"
                onClick={() => {
                  setFilters({ status: "", vehicleId: "", driverId: "" });
                  search("");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>

          <section className="cartao">
            {loading ? (
              <p role="status">Carregando viagens…</p>
            ) : (
              <div className="tabela-rolagem">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Saída</th>
                      <th>Local de saída</th>
                      <th>Veículo</th>
                      <th>Motorista</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDateTime(t.plannedDepartureAt)}</td>
                        <td>{t.municipalPickupPoint}</td>
                        <td>
                          <strong>{vehicleLabel(t.vehicle)}</strong>
                          <small className="tabela__sub">
                            {t.vehicle?.plate}
                          </small>
                        </td>
                        <td>
                          {t.driver?.user.name ?? (
                            <span className="status status--alerta">
                              Sem motorista
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`status ${STATUS_CLASS[t.status]}`}>
                            {STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td>
                          <div
                            className="viagem-acoes"
                            aria-label={`Ações da viagem de ${t.municipalPickupPoint}`}
                          >
                            <button
                              className="link"
                              onClick={() => setDetailsId(t.id)}
                            >
                              Participantes e detalhes
                            </button>
                            {t.status === "SCHEDULED" && (
                              <>
                                <button
                                  className="link"
                                  type="button"
                                  onClick={() => {
                                    setError("");
                                    setEditing(t);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="link"
                                  type="button"
                                  disabled={saving}
                                  onClick={() => {
                                    setReason("");
                                    setAction("");
                                    setError("");
                                    setOperation({ trip: t, kind: "cancel" });
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            {t.status === "IN_PROGRESS" && (
                              <button
                                className="link"
                                type="button"
                                disabled={saving}
                                onClick={() => {
                                  setReason("");
                                  setAction("");
                                  setError("");
                                  setOperation({ trip: t, kind: "interrupt" });
                                }}
                              >
                                Interromper
                              </button>
                            )}
                            <button
                              className="link"
                              type="button"
                              onClick={() => setParadaTrip(t.id)}
                            >
                              Paradas
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!listError && visiveis.length === 0 && (
                  <p
                    className="texto-suave"
                    style={{ margin: "16px 10px 4px" }}
                  >
                    Nenhuma viagem encontrada.
                  </p>
                )}
              </div>
            )}
            <Paginacao page={page} totalPages={totalPages} onGoTo={goTo} />
            <button
              type="button"
              className="botao botao--secundario"
              onClick={reload}
              disabled={loading}
              style={{ marginTop: 12 }}
            >
              Atualizar lista
            </button>
          </section>
        </>
      )}
    </AppLayout>
  );
}
