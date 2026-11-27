import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Campo from '../../components/Campo';
import Selecao from '../../components/Selecao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import './GerenciarParadas.css';

interface GerenciarParadasProps {
  tripId: string;
  onVoltar: () => void;
}

type StopDirection = 'OUTBOUND' | 'RETURN';
type StopType = 'MUNICIPAL_PICKUP' | 'APPOINTMENT' | 'MUNICIPAL_RETURN';

interface PatientTrip {
  id: string;
  cancelledAt: string | null;
  patient: { id: string; name: string };
}

interface TripStop {
  id: string;
  tripId: string;
  direction: StopDirection;
  sequence: number;
  name: string;
  address: string;
  municipality: string;
  stopType: StopType;
  plannedArrivalAt: string | null;
  notes: string | null;
  outboundPatientTrips: PatientTrip[];
  returnPatientTrips: PatientTrip[];
}

interface Trip { status: string; routeApprovedAt: string | null; municipalPickupPoint: string }

interface StopForm {
  direction: StopDirection;
  sequence: string;
  name: string;
  address: string;
  municipality: string;
  stopType: StopType;
  plannedArrivalAt: string;
  notes: string;
  patientIds: string[];
}

const EMPTY_FORM: StopForm = {
  direction: 'OUTBOUND',
  sequence: '',
  name: '',
  address: '',
  municipality: '',
  stopType: 'APPOINTMENT',
  plannedArrivalAt: '',
  notes: '',
  patientIds: [],
};

const STOP_TYPE_OPTIONS = [
  { valor: 'MUNICIPAL_PICKUP', rotulo: 'Embarque municipal' },
  { valor: 'APPOINTMENT', rotulo: 'Consulta / atendimento' },
  { valor: 'MUNICIPAL_RETURN', rotulo: 'Retorno municipal' },
];

const STOP_TYPE_LABEL: Record<StopType, string> = {
  MUNICIPAL_PICKUP: 'Embarque municipal',
  APPOINTMENT: 'Consulta',
  MUNICIPAL_RETURN: 'Retorno municipal',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function GerenciarParadas({ tripId, onVoltar }: GerenciarParadasProps) {
  const [stops, setStops] = useState<TripStop[]>([]);
  const [patients, setPatients] = useState<PatientTrip[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StopForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const [s, p, t] = await Promise.all([
        apiRequest<TripStop[]>(`/trips/${tripId}/stops`, { signal }),
        apiRequest<PatientTrip[]>(`/trips/${tripId}/patient-trips`, { signal }),
        apiRequest<Trip>(`/trips/${tripId}`, { signal }),
      ]);
      if (signal?.aborted) return;
      setStops(s);
      setPatients(p.filter((pt) => !pt.cancelledAt));
      setTrip(t);
    } catch (cause) {
      if (!signal?.aborted) { setTrip(null); setError(apiErrorMessage(cause)); }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const editable = trip?.status === 'SCHEDULED' && !loading && !saving;

  function editStop(stop: TripStop) {
    setEditing(stop.id);
    const date = stop.plannedArrivalAt ? new Date(stop.plannedArrivalAt) : null;
    setForm({ ...stop, sequence: String(stop.sequence), notes: stop.notes ?? '', plannedArrivalAt: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', patientIds: (stop.direction === 'OUTBOUND' ? stop.outboundPatientTrips : stop.returnPatientTrips).map(p => p.patient.id) });
    setFormOpen(true);
  }

  async function operation(path: string, method: string, message: string, body?: unknown) {
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(path, { method, ...(body !== undefined && { body: JSON.stringify(body) }) });
      setNotice(message); await load();
    } catch (cause) { await load(); setError(apiErrorMessage(cause)); }
    finally { setSaving(false); }
  }

  async function moveStop(index: number, delta: number) {
    const ids = outbound.map(s => s.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await operation(`/trips/${tripId}/stops/reorder`, 'PATCH', 'Sequência atualizada. Revise e aprove novamente.', { direction: 'OUTBOUND', stopIds: ids });
  }

  function togglePatient(id: string) {
    setForm((f) => ({
      ...f,
      patientIds: f.patientIds.includes(id)
        ? f.patientIds.filter((x) => x !== id)
        : [...f.patientIds, id],
    }));
  }

  async function saveStop(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/trips/${tripId}/stops${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          direction: form.direction,
          sequence: editing ? Number(form.sequence) : Math.max(0, ...stops.filter(stop => stop.direction === form.direction).map(stop => stop.sequence)) + 1,
          name: form.name.trim(),
          address: form.address.trim(),
          municipality: form.municipality.trim(),
          stopType: form.stopType,
          plannedArrivalAt: form.plannedArrivalAt ? new Date(form.plannedArrivalAt).toISOString() : undefined,
          notes: form.notes.trim() || undefined,
          patients: form.patientIds.map((id) => ({ patientId: id })),
        }),
      });
      setNotice('Parada salva. Revise a ida e o retorno e aprove novamente.');
      setFormOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function removeStop(stopId: string) {
    if (!window.confirm('Remover esta parada?')) return;
    await operation(`/trips/${tripId}/stops/${stopId}`, 'DELETE', 'Parada removida. Revise e aprove novamente.');
  }

  const outbound = stops.filter((s) => s.direction === 'OUTBOUND').sort((a, b) => a.sequence - b.sequence);
  const returning = stops.filter((s) => s.direction === 'RETURN').sort((a, b) => b.sequence - a.sequence);

  return (
    <div className="paradas">
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Paradas da viagem</h1>
          <p>Organize a ida manualmente. O retorno segue a ordem inversa. Alterações exigem nova aprovação.</p>
        </div>
        <div className="cabecalho__acoes">
          {!formOpen && editable && (
            <button className="botao botao--primario" onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM, sequence: String(Math.max(0, ...outbound.map(s => s.sequence)) + 1) }); setFormOpen(true); setError(''); setNotice(''); }}>
              Nova parada
            </button>
          )}
          <button className="botao botao--secundario" onClick={onVoltar}>
            ‹ Voltar
          </button>
        </div>
      </header>

      {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
      {error && <div className="aviso aviso--erro" role="alert">{error}</div>}
      {!loading && !trip && <button className="botao botao--secundario" onClick={() => void load()}>Tentar novamente</button>}
      {trip && <section className="cartao" aria-label="Aprovação da rota">
        <p role="status">{trip.routeApprovedAt ? `Rota aprovada em ${new Date(trip.routeApprovedAt).toLocaleString('pt-BR')}` : 'Rota aguardando aprovação. A sequência não está disponível ao motorista.'}</p>
        <p>Ponto municipal: {trip.municipalPickupPoint}</p>
        {editable && <div className="acoes">
          <button className="botao botao--secundario" disabled={formOpen || !outbound.length} onClick={() => void operation(`/trips/${tripId}/stops/rebuild-return`, 'POST', 'Retorno inverso gerado. Revise a sequência antes de aprovar.')}>Gerar retorno inverso</button>
          <button className="botao botao--primario" disabled={formOpen || !outbound.length || !!trip.routeApprovedAt} onClick={() => void operation(`/trips/${tripId}/approve-route`, 'PATCH', 'Rota aprovada e disponível ao motorista.')}>Aprovar sequência revisada</button>
        </div>}
      </section>}

      {formOpen && trip?.status === 'SCHEDULED' && (
        <form className="cartao paradas__formulario" onSubmit={saveStop}>
          <h2 className="cartao__titulo">{editing ? 'Editar parada' : 'Nova parada de ida'}</h2>
          <p className="texto-suave">{editing ? 'Atualize os dados desta parada. A ordem pode ser ajustada pelos botões Subir e Descer na lista.' : 'A parada será adicionada ao final da ida. Depois de salvar, use Subir e Descer para ajustar a ordem.'}</p>
          <fieldset className="paradas__campos" disabled={saving}>
          <div className="paradas__form-grid">
          <section className="paradas__bloco" aria-labelledby="parada-local-titulo"><h3 id="parada-local-titulo">Local da parada</h3><p className="texto-suave">{form.direction === 'OUTBOUND' ? 'Ida: desembarque dos pacientes no estabelecimento.' : 'Retorno: embarque dos pacientes. Local e vínculos seguem a ida.'}</p>
          <div className="grade">
            <Selecao id="stopType" rotulo="Tipo" opcoes={STOP_TYPE_OPTIONS}
              disabled={form.direction === 'RETURN'}
              value={form.stopType}
              onChange={(e) => setForm({ ...form, stopType: e.target.value as StopType, patientIds: e.target.value === 'APPOINTMENT' ? form.patientIds : [] })} />
            <Campo id="stop-name" rotulo="Nome do local" value={form.name} required maxLength={200} disabled={form.direction === 'RETURN'}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Campo id="stop-address" rotulo="Endereço" value={form.address} required maxLength={300} disabled={form.direction === 'RETURN'}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Campo id="stop-municipality" rotulo="Município" value={form.municipality} required maxLength={100} disabled={form.direction === 'RETURN'}
              onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
            <Campo id="stop-arrival" rotulo="Previsão de chegada (opcional)" type="datetime-local"
              value={form.plannedArrivalAt}
              onChange={(e) => setForm({ ...form, plannedArrivalAt: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="stop-notes">Observações (opcional, até 500 caracteres)</label>
            <textarea id="stop-notes" rows={2} value={form.notes} maxLength={500}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          </section>
          <section className="paradas__bloco" aria-labelledby="parada-pacientes-titulo"><h3 id="parada-pacientes-titulo">Pacientes da parada</h3>
          <p className="texto-suave">{form.direction === 'RETURN' ? 'As associações são sincronizadas com a parada de ida.' : form.stopType !== 'APPOINTMENT' ? 'Somente paradas de consulta recebem associações de pacientes.' : 'Selecione os pacientes que serão atendidos neste local. Os vínculos também serão usados no retorno.'}</p>
          {patients.length > 0 && form.direction === 'OUTBOUND' ? (
              <div className="paradas__pacientes">
                {patients.map((p) => (
                  <label key={p.id} className="check">
                    <input type="checkbox" checked={form.patientIds.includes(p.patient.id)} disabled={form.stopType !== 'APPOINTMENT'}
                      onChange={() => togglePatient(p.patient.id)} />
                    {p.patient.name}
                  </label>
                ))}
              </div>
          ) : <p className="texto-suave">{form.direction === 'OUTBOUND' ? 'Adicione participantes à viagem para associá-los aqui.' : 'Para alterar pacientes, edite a parada correspondente da ida.'}</p>}
          </section>
          </div>
          <div className="acoes">
            <button type="button" className="botao botao--secundario" disabled={saving}
              onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); setError(''); }}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar parada'}
            </button>
          </div>
          </fieldset>
        </form>
      )}

      {loading ? (
        <p role="status">Carregando paradas…</p>
      ) : (
        <div className="paradas__secoes">
          {([{ label: 'Ida — desembarque nos estabelecimentos', list: outbound }, { label: 'Retorno — embarque nos estabelecimentos', list: returning }] as const).map(({ label, list }) => (
            <section key={label} className="cartao">
              <h2 className="cartao__titulo">Sequência — {label}</h2>
              {list.length === 0 ? (
                <p className="texto-suave">Nenhuma parada cadastrada.</p>
              ) : (
                <ol className="paradas__lista">
                  {list.map((s, index) => {
                    const associados = s.direction === 'OUTBOUND'
                      ? s.outboundPatientTrips
                      : s.returnPatientTrips;
                    return (
                      <li key={s.id} className="paradas__item">
                        <div className="paradas__item-header">
                          <strong>{index + 1}. {s.name}</strong>
                          <span className="status status--info">{STOP_TYPE_LABEL[s.stopType]}</span>
                          {editable && <button className="link" type="button" disabled={formOpen} onClick={() => editStop(s)}>Editar</button>}
                          {editable && s.direction === 'OUTBOUND' && <>
                          <button className="link" disabled={index === 0 || formOpen} aria-label={`Mover ${s.name} para cima`} onClick={() => void moveStop(index, -1)}>↑ Subir</button>
                          <button className="link" disabled={index === list.length - 1 || formOpen} aria-label={`Mover ${s.name} para baixo`} onClick={() => void moveStop(index, 1)}>↓ Descer</button>
                          <button className="link paradas__remover" type="button"
                            disabled={formOpen}
                            onClick={() => void removeStop(s.id)}>
                            Remover
                          </button>
                          </>}
                        </div>
                        <p className="texto-suave paradas__endereco">{s.address} — {s.municipality}</p>
                        {s.notes && <p>{s.notes}</p>}
                        {s.plannedArrivalAt && (
                          <p className="texto-suave">Previsão: {formatTime(s.plannedArrivalAt)}</p>
                        )}
                        {associados.length > 0 && (
                          <ul className="paradas__pacientes-lista">
                            {associados.map((pt) => (
                              <li key={pt.id}>👤 {pt.patient.name}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
