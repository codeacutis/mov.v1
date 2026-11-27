import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest, apiErrorMessage } from "../../services/api";
import "./AppMotorista.css";

type TripStatus =
  "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "INTERRUPTED";
type OutboundStatus = "PLANNED" | "BOARDED" | "NO_SHOW";
type ReturnStatus = "EXPECTED" | "RETURNED" | "NOT_RETURNING" | "NO_SHOW";
interface Contact {
  name: string;
  phone: string | null;
}
interface Participant {
  id: string;
  patient: Contact & {
    usesWheelchair: boolean;
    hasReducedMobility: boolean;
    needsBoardingAssistance: boolean;
  };
  companions: Contact[];
  appointmentLocationName: string | null;
  appointmentAddress: string | null;
  appointmentMunicipality: string | null;
  appointmentAt: string | null;
  outboundStatus: OutboundStatus;
  returnStatus: ReturnStatus;
  outboundStopId: string | null;
  returnStopId: string | null;
}
interface TripSummary {
  id: string;
  status: TripStatus;
  municipalPickupPoint: string;
  plannedDepartureAt: string;
  plannedReturnStartAt: string;
  actualDepartureAt: string | null;
  actualReturnStartAt: string | null;
  actualReturnAt: string | null;
  vehicle: { plate: string; description: string | null; capacity: number };
  _count: { patientTrips: number };
}
interface TripDetail extends TripSummary {
  routeApprovedAt: string | null;
  patientTrips: Participant[];
  stops: {
    id: string;
    direction: "OUTBOUND" | "RETURN";
    sequence: number;
    name: string;
    address: string;
    municipality: string;
    stopType: "MUNICIPAL_PICKUP" | "APPOINTMENT" | "MUNICIPAL_RETURN";
    plannedArrivalAt: string | null;
  }[];
}
type RecordType = "INCIDENT" | "CONTACT_ATTEMPT" | "NOT_RETURNING" | "NO_SHOW";
interface RecordForm {
  type: RecordType;
  participantId: string;
}
const STATUS: Record<TripStatus, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  INTERRUPTED: "Interrompida",
};
const OUTBOUND: Record<OutboundStatus, string> = {
  PLANNED: "Aguardando embarque",
  BOARDED: "Embarcou na ida",
  NO_SHOW: "Ausente na ida",
};
const RETURN: Record<ReturnStatus, string> = {
  EXPECTED: "Retorno esperado",
  RETURNED: "Embarcou no retorno",
  NOT_RETURNING: "Avisou que não retornará",
  NO_SHOW: "Ausente no retorno",
};
const RECORD: Record<RecordType, string> = {
  INCIDENT: "Registrar ocorrência",
  CONTACT_ATTEMPT: "Registrar tentativa de contato",
  NOT_RETURNING: "Informar que não retornará",
  NO_SHOW: "Registrar ausência no retorno",
};
function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não registrado";
}
function ContactInfo({ contact }: { contact: Contact }) {
  const dial = contact.phone?.replace(/[^\d+]/g, "");
  return (
    <span>
      {contact.name} ·{" "}
      {dial ? (
        <a href={`tel:${dial}`}>{contact.phone}</a>
      ) : (
        "Telefone não informado"
      )}
    </span>
  );
}

export default function AppMotorista({
  onSair,
  userName,
}: {
  onSair: () => void;
  userName: string;
}) {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [revision, setRevision] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<RecordForm | null>(null);
  const [reason, setReason] = useState("");
  const [contactAttempt, setContactAttempt] = useState("");
  const mutation = useRef<AbortController | null>(null);
  const recordSection = useRef<HTMLElement | null>(null);
  const trip = detail?.id === selectedId ? detail : null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoadingList(true);
      setListError("");
      try {
        const result = await apiRequest<TripSummary[]>("/driver/trips", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setTrips(result);
        setSelectedId((current) =>
          result.some((item) => item.id === current)
            ? current
            : ((
                result.find((item) => item.status === "IN_PROGRESS") ??
                result.find((item) => item.status === "SCHEDULED") ??
                result.at(-1)
              )?.id ?? ""),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(apiErrorMessage(error));
          setTrips([]);
          setSelectedId("");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingList(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoadingDetail(true);
      setDetailError("");
      try {
        const result = await apiRequest<TripDetail>(
          `/driver/trips/${selectedId}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setDetail(result);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetail(null);
          setDetailError(apiErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoadingDetail(false);
      }
    }
    if (selectedId) void load();
    return () => controller.abort();
  }, [selectedId, revision]);

  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    if (record)
      recordSection.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
  }, [record]);

  function openRecord(type: RecordType, participantId = "") {
    setRecord({ type, participantId });
    setReason("");
    setContactAttempt("");
    setOperationError("");
    setNotice("");
  }
  async function operate(suffix: string, body?: object, method = "PATCH") {
    if (busy || !trip) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setOperationError("");
    setNotice("");
    try {
      await apiRequest<void>(`/driver/trips/${trip.id}/${suffix}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setNotice("Registro salvo com sucesso.");
        setRecord(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) setOperationError(apiErrorMessage(error));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        setRevision((value) => value + 1);
      }
    }
  }
  function saveRecord(event: FormEvent) {
    event.preventDefault();
    if (
      !record ||
      !reason.trim() ||
      (record.type !== "INCIDENT" && !record.participantId) ||
      (record.type === "NO_SHOW" && !contactAttempt.trim())
    ) {
      setOperationError("Preencha os campos obrigatórios.");
      return;
    }
    if (record.type === "NO_SHOW" || record.type === "NOT_RETURNING") {
      void operate(`participants/${record.participantId}/return-status`, {
        status: record.type,
        reason: reason.trim(),
        ...(record.type === "NO_SHOW"
          ? { contactAttempt: contactAttempt.trim() }
          : {}),
      });
    } else {
      void operate(
        "observations",
        {
          type: record.type,
          description: reason.trim(),
          ...(record.participantId
            ? { patientTripId: record.participantId }
            : {}),
        },
        "POST",
      );
    }
  }
  const active = trip?.status === "IN_PROGRESS";
  const returning = !!trip?.actualReturnStartAt;
  const disabled = busy || loadingList || loadingDetail;
  const companions =
    trip?.patientTrips.reduce(
      (total, item) => total + item.companions.length,
      0,
    ) ?? 0;

  return (
    <main className="driver-portal">
      <header className="driver-portal__header">
        <div>
          <p className="texto-suave">Mov+ · Área do motorista</p>
          <h1>Olá, {userName}</h1>
        </div>
        <button className="botao" onClick={onSair} disabled={busy}>
          Sair
        </button>
      </header>
      <section className="cartao">
        <div className="campo">
          <label htmlFor="driver-trip">Viagens atribuídas</label>
          <select
            id="driver-trip"
            value={selectedId}
            disabled={disabled || !trips.length}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setRecord(null);
              setNotice("");
              setOperationError("");
            }}
          >
            {!trips.length && <option value="">Nenhuma viagem</option>}
            {trips.map((item) => (
              <option value={item.id} key={item.id}>
                {date(item.plannedDepartureAt)} · {item.vehicle.plate} ·{" "}
                {STATUS[item.status]}
              </option>
            ))}
          </select>
        </div>
        <button
          className="botao"
          disabled={disabled}
          onClick={() => setRevision((value) => value + 1)}
        >
          Atualizar viagens
        </button>
      </section>
      {loadingList && <p role="status">Carregando viagens…</p>}
      {listError && (
        <p className="aviso aviso--erro" role="alert">
          {listError}
        </p>
      )}
      {!loadingList && !listError && !trips.length && (
        <p>Nenhuma viagem atribuída a você.</p>
      )}
      {selectedId && loadingDetail && <p role="status">Carregando operação…</p>}
      {selectedId && detailError && (
        <p className="aviso aviso--erro" role="alert">
          {detailError}
        </p>
      )}
      {operationError && !record && (
        <p className="aviso aviso--erro" role="alert">
          {operationError}
        </p>
      )}
      {notice && (
        <p className="aviso" role="status">
          {notice}
        </p>
      )}
      {trip && !detailError && (
        <>
          <section className="cartao" aria-label="Dados da viagem">
            <h2>{trip.municipalPickupPoint}</h2>
            <p>
              <strong>{STATUS[trip.status]}</strong>
              {active &&
                ` · ${returning ? "Etapa de retorno" : "Etapa de ida"}`}
            </p>
            <p>
              Veículo: {trip.vehicle.plate}
              {trip.vehicle.description && ` · ${trip.vehicle.description}`}
            </p>
            <p>
              Capacidade: {trip.vehicle.capacity} · Pacientes:{" "}
              {trip.patientTrips.length} · Acompanhantes: {companions}
            </p>
            <dl className="driver-portal__times">
              <div>
                <dt>Saída planejada</dt>
                <dd>{date(trip.plannedDepartureAt)}</dd>
              </div>
              <div>
                <dt>Retorno planejado</dt>
                <dd>{date(trip.plannedReturnStartAt)}</dd>
              </div>
              <div>
                <dt>Saída real</dt>
                <dd>{date(trip.actualDepartureAt)}</dd>
              </div>
              <div>
                <dt>Início real do retorno</dt>
                <dd>{date(trip.actualReturnStartAt)}</dd>
              </div>
              <div>
                <dt>Chegada real</dt>
                <dd>{date(trip.actualReturnAt)}</dd>
              </div>
            </dl>
            <p>
              {trip.routeApprovedAt
                ? `Rota aprovada em ${date(trip.routeApprovedAt)}`
                : "Aguardando aprovação da rota pela administração."}
            </p>
            <div className="driver-portal__actions">
              {trip.status === "SCHEDULED" && trip.routeApprovedAt && (
                <button
                  className="botao botao--primario"
                  disabled={disabled}
                  onClick={() => void operate("start")}
                >
                  Iniciar viagem
                </button>
              )}
              {active && !returning && (
                <button
                  className="botao botao--primario"
                  disabled={disabled}
                  onClick={() => void operate("start-return")}
                >
                  Iniciar retorno
                </button>
              )}
              {active && returning && (
                <button
                  className="botao botao--primario"
                  disabled={disabled}
                  onClick={() => void operate("complete")}
                >
                  Concluir viagem
                </button>
              )}
              {active && (
                <button
                  className="botao"
                  disabled={disabled}
                  onClick={() => openRecord("INCIDENT")}
                >
                  Registrar ocorrência
                </button>
              )}
            </div>
            <p className="texto-suave">
              Os horários reais são registrados pelo servidor ao confirmar cada
              ação.
            </p>
          </section>

          <section aria-label="Participantes">
            <h2>Pacientes e acompanhantes</h2>
            {!trip.patientTrips.length && <p>Nenhum paciente associado.</p>}
            {trip.patientTrips.map((item) => (
              <article
                className="cartao"
                key={item.id}
                aria-label={`Participação de ${item.patient.name}`}
              >
                <h3>{item.patient.name}</h3>
                <p>
                  <ContactInfo contact={item.patient} />
                </p>
                {item.companions.map((contact, index) => (
                  <p key={index}>
                    Acompanhante: <ContactInfo contact={contact} />
                  </p>
                ))}
                {(item.patient.usesWheelchair ||
                  item.patient.hasReducedMobility ||
                  item.patient.needsBoardingAssistance) && (
                  <ul
                    className="driver-portal__access"
                    aria-label="Acessibilidade"
                  >
                    {item.patient.usesWheelchair && (
                      <li>Utiliza cadeira de rodas</li>
                    )}
                    {item.patient.hasReducedMobility && (
                      <li>Mobilidade reduzida</li>
                    )}
                    {item.patient.needsBoardingAssistance && (
                      <li>Necessita auxílio no embarque</li>
                    )}
                  </ul>
                )}
                <p>
                  Consulta:{" "}
                  {item.appointmentLocationName ??
                    "Estabelecimento não informado"}{" "}
                  · {date(item.appointmentAt)}
                </p>
                <p>
                  {[item.appointmentAddress, item.appointmentMunicipality]
                    .filter(Boolean)
                    .join(" · ") || "Endereço da consulta não informado"}
                </p>
                <p>
                  Ida: <strong>{OUTBOUND[item.outboundStatus]}</strong>
                  <br />
                  Retorno: <strong>{RETURN[item.returnStatus]}</strong>
                </p>
                {active && (
                  <div className="driver-portal__actions">
                    {!returning && item.outboundStatus !== "BOARDED" && (
                      <button
                        className="botao"
                        disabled={disabled}
                        onClick={() =>
                          void operate(
                            `participants/${item.id}/outbound-status`,
                            { status: "BOARDED" },
                          )
                        }
                      >
                        Registrar embarque na ida
                      </button>
                    )}
                    {!returning && item.outboundStatus !== "NO_SHOW" && (
                      <button
                        className="botao"
                        disabled={disabled}
                        onClick={() =>
                          void operate(
                            `participants/${item.id}/outbound-status`,
                            { status: "NO_SHOW" },
                          )
                        }
                      >
                        Registrar ausência na ida
                      </button>
                    )}
                    {returning &&
                      item.outboundStatus === "BOARDED" &&
                      item.returnStatus !== "RETURNED" && (
                        <button
                          className="botao"
                          disabled={disabled}
                          onClick={() =>
                            void operate(
                              `participants/${item.id}/return-status`,
                              { status: "RETURNED" },
                            )
                          }
                        >
                          Registrar embarque no retorno
                        </button>
                      )}
                    {returning &&
                      item.returnStatus !== "RETURNED" &&
                      item.returnStatus !== "NO_SHOW" && (
                        <button
                          className="botao"
                          disabled={disabled}
                          onClick={() => openRecord("NO_SHOW", item.id)}
                        >
                          Registrar ausência no retorno
                        </button>
                      )}
                    {item.returnStatus !== "RETURNED" &&
                      item.returnStatus !== "NOT_RETURNING" && (
                        <button
                          className="botao"
                          disabled={disabled}
                          onClick={() => openRecord("NOT_RETURNING", item.id)}
                        >
                          Informar que não retornará
                        </button>
                      )}
                    <button
                      className="botao"
                      disabled={disabled}
                      onClick={() => openRecord("CONTACT_ATTEMPT", item.id)}
                    >
                      Registrar tentativa de contato
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>

          {record && active && (
            <section
              ref={recordSection}
              className="cartao"
              aria-label="Registro operacional"
            >
              <h2>{RECORD[record.type]}</h2>
              {operationError && (
                <p className="aviso aviso--erro" role="alert">
                  {operationError}
                </p>
              )}
              <form onSubmit={saveRecord}>
                <div className="campo">
                  <label htmlFor="driver-participant">
                    Paciente{record.type === "INCIDENT" ? " (opcional)" : ""}
                  </label>
                  <select
                    id="driver-participant"
                    value={record.participantId}
                    disabled={disabled}
                    required={record.type !== "INCIDENT"}
                    onChange={(event) =>
                      setRecord({
                        ...record,
                        participantId: event.target.value,
                      })
                    }
                  >
                    <option value="">
                      {record.type === "INCIDENT"
                        ? "Ocorrência geral da viagem"
                        : "Selecione o paciente"}
                    </option>
                    {trip.patientTrips
                      .filter(
                        (item) =>
                          (record.type !== "NOT_RETURNING" &&
                            record.type !== "NO_SHOW") ||
                          item.returnStatus !== "RETURNED",
                      )
                      .map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.patient.name}
                        </option>
                      ))}
                  </select>
                </div>
                {record.type === "NO_SHOW" && (
                  <div className="campo">
                    <label htmlFor="driver-contact">
                      Tentativa de contato realizada
                    </label>
                    <textarea
                      id="driver-contact"
                      value={contactAttempt}
                      onChange={(event) =>
                        setContactAttempt(event.target.value)
                      }
                      required
                      maxLength={500}
                      disabled={disabled}
                    />
                  </div>
                )}
                <div className="campo">
                  <label htmlFor="driver-reason">
                    {record.type === "NO_SHOW" ||
                    record.type === "NOT_RETURNING"
                      ? "Motivo / justificativa"
                      : "Descrição do registro"}
                  </label>
                  <textarea
                    id="driver-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    maxLength={500}
                    disabled={disabled}
                    aria-describedby="driver-record-help"
                  />
                </div>
                <p id="driver-record-help" className="texto-suave">
                  Registre somente informações necessárias ao transporte. Não
                  inclua diagnósticos.
                </p>
                <div className="driver-portal__actions">
                  <button
                    className="botao botao--primario"
                    disabled={disabled}
                    type="submit"
                  >
                    {busy ? "Salvando…" : "Salvar registro"}
                  </button>
                  <button
                    className="botao"
                    disabled={disabled}
                    type="button"
                    onClick={() => setRecord(null)}
                  >
                    Cancelar registro
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="cartao" aria-label="Sequência aprovada">
            <h2>Roteiro aprovado</h2>
            {!trip.routeApprovedAt ? (
              <p>A sequência será disponibilizada após aprovação.</p>
            ) : (
              (["OUTBOUND", "RETURN"] as const).map((direction) => (
                <div key={direction}>
                  <h3>
                    {direction === "OUTBOUND"
                      ? "Ida · desembarque"
                      : "Retorno · embarque"}
                  </h3>
                  <ol
                    className="driver-portal__stops"
                    aria-label={
                      direction === "OUTBOUND"
                        ? "Paradas da ida"
                        : "Paradas do retorno"
                    }
                  >
                    {trip.stops
                      .filter((stop) => stop.direction === direction)
                      .map((stop) => (
                        <li key={stop.id}>
                          <strong>{stop.name}</strong>
                          <p>
                            {stop.address} · {stop.municipality}
                          </p>
                          {stop.plannedArrivalAt && (
                            <p>Previsão: {date(stop.plannedArrivalAt)}</p>
                          )}
                          <ul>
                            {trip.patientTrips
                              .filter(
                                (item) =>
                                  (direction === "OUTBOUND"
                                    ? item.outboundStopId
                                    : item.returnStopId) === stop.id,
                              )
                              .map((item) => (
                                <li key={item.id}>{item.patient.name}</li>
                              ))}
                          </ul>
                        </li>
                      ))}
                  </ol>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
