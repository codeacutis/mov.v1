import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiErrorMessage, apiRequest } from '../services/api';

type Times = { actualDepartureAt: string | null; actualReturnStartAt: string | null; actualReturnAt: string | null };
type Observation = { id: string; type: string; description: string; patientTripId: string | null; createdAt: string; author: { name: string } };
const labels = { actualDepartureAt: 'Saída real', actualReturnStartAt: 'Início real do retorno', actualReturnAt: 'Chegada real' } as const;
type Field = keyof Times;
export default function HistoricoViagem({ tripId, times, onSaved }: { tripId: string; times: Times; onSaved: () => Promise<void> }) {
  const [observations, setObservations] = useState<Observation[] | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [field, setField] = useState<Field>('actualDepartureAt'); const [value, setValue] = useState(''); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => { setLoading(true); setError(''); try { const data = await apiRequest<Observation[]>(`/trips/${tripId}/observations`, { signal }); if (!signal?.aborted) setObservations(data); } catch (e) { if (!signal?.aborted) { setObservations(null); setError(apiErrorMessage(e)); } } finally { if (!signal?.aborted) setLoading(false); } }, [tripId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function correct(event: FormEvent) {
    event.preventDefault(); if (!reason.trim() || !value) return; setSaving(true); setError(''); setNotice('');
    try { await apiRequest(`/trips/${tripId}/actual-times`, { method: 'PATCH', body: JSON.stringify({ [times[field] ? field : available[0]]: new Date(value).toISOString(), reason: reason.trim() }) }); setNotice('Horário corrigido e registrado na auditoria.'); setReason(''); setValue(''); await onSaved(); }
    catch (e) { setError(apiErrorMessage(e)); } finally { setSaving(false); }
  }
  const available = (Object.keys(labels) as Field[]).filter(key => times[key]);
  return <section className="cartao"><h2>Histórico operacional</h2>
    <h3>Horários reais</h3>{(Object.keys(labels) as Field[]).map(key => <p key={key}>{labels[key]}: {times[key] ? new Date(times[key]!).toLocaleString('pt-BR') : 'Não registrado'}</p>)}
    {available.length > 0 && <form onSubmit={correct}><h3>Corrigir horário registrado</h3><label htmlFor="history-field">Horário</label><select id="history-field" value={available.includes(field) ? field : available[0]} onChange={e => setField(e.target.value as Field)}>{available.map(key => <option key={key} value={key}>{labels[key]}</option>)}</select>
      <label htmlFor="history-time">Novo horário</label><input id="history-time" type="datetime-local" required value={value} onChange={e => setValue(e.target.value)} />
      <label htmlFor="history-reason">Justificativa</label><input id="history-reason" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
      <button className="botao botao--primario" disabled={saving}>{saving ? 'Salvando…' : 'Corrigir horário'}</button></form>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    <h3>Ocorrências</h3>{loading ? <p role="status">Carregando ocorrências…</p> : observations && (observations.length ? observations.map(o => <article key={o.id}><p><strong>{o.type === 'CONTACT_ATTEMPT' ? 'Tentativa de contato' : 'Ocorrência'}</strong> · {new Date(o.createdAt).toLocaleString('pt-BR')} · {o.author.name}</p><p>{o.description}</p>{o.patientTripId && <p>Participação: {o.patientTripId}</p>}</article>) : <p>Nenhuma ocorrência registrada.</p>)}
    {!loading && !observations && <button type="button" onClick={() => void load()}>Tentar novamente</button>}
  </section>;
}
