import { useEffect, useState, type FormEvent } from 'react';
import Campo from '../../components/Campo';
import Selecao from '../../components/Selecao';
import { apiRequest, apiErrorMessage, fetchAllPages } from '../../services/api';
import './GerenciarParadas.css';

interface GerenciarParadasProps {
  tripId: string;
  onVoltar: () => void;
}

type StopDirection = 'OUTBOUND' | 'RETURN';
type StopType = 'MUNICIPAL_PICKUP' | 'APPOINTMENT' | 'MUNICIPAL_RETURN';

interface PatientTrip {
  id: string;
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

interface Patient {
  id: string;
  name: string;
  isActive: boolean;
}

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

const DIRECTION_OPTIONS = [
  { valor: 'OUTBOUND', rotulo: 'Ida' },
  { valor: 'RETURN', rotulo: 'Retorno' },
];

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
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function GerenciarParadas({ tripId, onVoltar }: GerenciarParadasProps) {
  const [stops, setStops] = useState<TripStop[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StopForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [s, p] = await Promise.all([
        apiRequest<TripStop[]>(`/trips/${tripId}/stops`),
        fetchAllPages<Patient>('/patients'),
      ]);
      setStops(s);
      setPatients(p.filter((pt) => pt.isActive));
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [tripId]);

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
      await apiRequest(`/trips/${tripId}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          direction: form.direction,
          sequence: Number(form.sequence),
          name: form.name.trim(),
          address: form.address.trim(),
          municipality: form.municipality.trim(),
          stopType: form.stopType,
          plannedArrivalAt: form.plannedArrivalAt || undefined,
          notes: form.notes.trim() || undefined,
          patients: form.patientIds.map((id) => ({ patientId: id })),
        }),
      });
      setNotice('Parada cadastrada.');
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
    setError('');
    setNotice('');
    try {
      await apiRequest(`/trips/${tripId}/stops/${stopId}`, { method: 'DELETE' });
      setNotice('Parada removida.');
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause));
    }
  }

  const outbound = stops.filter((s) => s.direction === 'OUTBOUND').sort((a, b) => a.sequence - b.sequence);
  const returning = stops.filter((s) => s.direction === 'RETURN').sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="paradas">
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Paradas da viagem</h1>
          <p>Gerencie os pontos de parada e os pacientes associados.</p>
        </div>
        <div className="cabecalho__acoes">
          {!formOpen && (
            <button className="botao botao--primario" onClick={() => { setFormOpen(true); setError(''); setNotice(''); }}>
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

      {formOpen && (
        <form className="cartao" onSubmit={saveStop}>
          <h2 className="cartao__titulo">Nova parada</h2>
          <div className="grade">
            <Selecao id="direction" rotulo="Direção" opcoes={DIRECTION_OPTIONS}
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as StopDirection })} />
            <Campo id="sequence" rotulo="Sequência" type="number" min={1} step={1}
              value={form.sequence} required
              onChange={(e) => setForm({ ...form, sequence: e.target.value })} />
            <Selecao id="stopType" rotulo="Tipo" opcoes={STOP_TYPE_OPTIONS}
              value={form.stopType}
              onChange={(e) => setForm({ ...form, stopType: e.target.value as StopType })} />
            <Campo id="stop-name" rotulo="Nome do local" value={form.name} required
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Campo id="stop-address" rotulo="Endereço" value={form.address} required
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Campo id="stop-municipality" rotulo="Município" value={form.municipality} required
              onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
            <Campo id="stop-arrival" rotulo="Previsão de chegada" type="datetime-local"
              value={form.plannedArrivalAt}
              onChange={(e) => setForm({ ...form, plannedArrivalAt: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="stop-notes">Observações</label>
            <textarea id="stop-notes" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {patients.length > 0 && (
            <fieldset className="secao">
              <legend>Associar pacientes a esta parada</legend>
              <div className="paradas__pacientes">
                {patients.map((p) => (
                  <label key={p.id} className="check">
                    <input type="checkbox" checked={form.patientIds.includes(p.id)}
                      onChange={() => togglePatient(p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="acoes">
            <button type="button" className="botao botao--secundario" disabled={saving}
              onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); setError(''); }}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar parada'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p role="status">Carregando paradas…</p>
      ) : (
        <div className="paradas__secoes">
          {([{ label: 'Ida', list: outbound }, { label: 'Retorno', list: returning }] as const).map(({ label, list }) => (
            <section key={label} className="cartao">
              <h2 className="cartao__titulo">Sequência — {label}</h2>
              {list.length === 0 ? (
                <p className="texto-suave">Nenhuma parada cadastrada.</p>
              ) : (
                <ol className="paradas__lista">
                  {list.map((s) => {
                    const associados = s.direction === 'OUTBOUND'
                      ? s.outboundPatientTrips
                      : s.returnPatientTrips;
                    return (
                      <li key={s.id} className="paradas__item">
                        <div className="paradas__item-header">
                          <strong>{s.sequence}. {s.name}</strong>
                          <span className="status status--info">{STOP_TYPE_LABEL[s.stopType]}</span>
                          <button className="link paradas__remover" type="button"
                            onClick={() => void removeStop(s.id)}>
                            Remover
                          </button>
                        </div>
                        <p className="texto-suave paradas__endereco">{s.address} — {s.municipality}</p>
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
