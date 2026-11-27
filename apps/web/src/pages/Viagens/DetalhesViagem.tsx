import { useCallback, useEffect, useState, type FormEvent } from 'react';
import HistoricoViagem from '../../components/HistoricoViagem';
import Campo from '../../components/Campo';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
interface Patient { id: string; name: string; isActive: boolean }
interface Companion { id: string; name: string; phone: string; relationship: string | null }
interface Participation {
  id: string; patientId: string; patient: { name: string; phone: string | null };
  appointmentLocationName: string | null; appointmentAddress: string | null;
  appointmentMunicipality: string | null; appointmentAt: string | null;
  priority: Priority; priorityJustification: string | null;
  priorityDefinedAt: string; priorityDefinedBy: { name: string };
  confirmationStatus: string; cancelledAt: string | null; cancellationReason: string | null;
  _count: { companions: number };
}
interface Trip { actualDepartureAt: string | null; actualReturnStartAt: string | null; actualReturnAt: string | null; status: string; municipalPickupPoint: string; plannedDepartureAt: string; vehicle: { plate: string; capacity: number } }
interface Consultation { patientId: string; appointmentLocationName: string; appointmentAddress: string; appointmentMunicipality: string; appointmentAt: string; priority: Priority; priorityJustification: string }
const empty: Consultation = { patientId: '', appointmentLocationName: '', appointmentAddress: '', appointmentMunicipality: '', appointmentAt: '', priority: 'MEDIUM', priorityJustification: '' };
const priorities: Record<Priority, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };
const confirmations: Record<string, string> = { PENDING: 'Pendente', CONFIRMED: 'Confirmada', DECLINED: 'Recusada', NO_RESPONSE: 'Sem resposta' };
function localDate(iso: string) { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
const dateLabel = (iso: string) => new Date(iso).toLocaleString('pt-BR');

export default function DetalhesViagem({ tripId, onVoltar }: { tripId: string; onVoltar: () => void }) {
  const [trip, setTrip] = useState<Trip>();
  const [items, setItems] = useState<Participation[]>([]);
  const [companions, setCompanions] = useState<Record<string, Companion[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Consultation | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [companionForm, setCompanionForm] = useState<{ patientTripId: string; id?: string; name: string; phone: string; relationship: string } | null>(null);
  const [cancelling, setCancelling] = useState<Participation | null>(null);
  const [reason, setReason] = useState('');
  const patients = usePaginatedList<Patient>('/patients');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setLoadError('');
    try {
      const [detail, rows] = await Promise.all([
        apiRequest<Trip>(`/trips/${tripId}`, { signal }),
        apiRequest<Participation[]>(`/trips/${tripId}/patient-trips`, { signal }),
      ]);
      const entries = await Promise.all(rows.map(async row => [row.id, await apiRequest<Companion[]>(`/patient-trips/${row.id}/companions`, { signal })] as const));
      if (signal?.aborted) return;
      setTrip(detail); setItems(rows); setCompanions(Object.fromEntries(entries));
    } catch (cause) { if (!signal?.aborted) setLoadError(apiErrorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [tripId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const active = items.filter(item => !item.cancelledAt);
  const companionCount = active.reduce((sum, item) => sum + item._count.companions, 0);
  const available = (trip?.vehicle.capacity ?? 0) - active.length - companionCount;
  const editable = trip?.status === 'SCHEDULED' && !loading && !loadError;

  async function mutate(path: string, method: string, body?: object) {
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setForm(null); setCompanionForm(null); setCancelling(null);
      setNotice('Alteração salva.');
      await load();
    } catch (cause) { setError(apiErrorMessage(cause)); await load(); }
    finally { setSaving(false); }
  }
  function edit(item: Participation) {
    setEditing(item.id); setCompanionForm(null); setCancelling(null); setError('');
    setForm({ patientId: item.patientId, appointmentLocationName: item.appointmentLocationName ?? '', appointmentAddress: item.appointmentAddress ?? '', appointmentMunicipality: item.appointmentMunicipality ?? '', appointmentAt: item.appointmentAt ? localDate(item.appointmentAt) : '', priority: item.priority, priorityJustification: item.priorityJustification ?? '' });
  }
  function saveConsultation(event: FormEvent) {
    event.preventDefault(); if (!form) return;
    const { patientId, ...fields } = form;
    const payload = { ...fields, appointmentLocationName: fields.appointmentLocationName.trim(), appointmentAddress: fields.appointmentAddress.trim(), appointmentMunicipality: fields.appointmentMunicipality.trim(), priorityJustification: fields.priorityJustification.trim(), appointmentAt: new Date(fields.appointmentAt).toISOString() };
    void mutate(editing ? `/patient-trips/${editing}` : `/trips/${tripId}/patient-trips`, editing ? 'PATCH' : 'POST', editing ? payload : { ...payload, patientId });
  }

  return <>
    <header className="cabecalho cabecalho--linha"><div><h1>Participantes da viagem</h1>{trip && <p>{trip.municipalPickupPoint} · {dateLabel(trip.plannedDepartureAt)} · {trip.vehicle.plate}</p>}</div><button className="botao botao--secundario" disabled={saving} onClick={onVoltar}>Voltar para viagens</button></header>
    {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
    {error && <div className="aviso aviso--erro" role="alert">{error}</div>}
    {loadError && <div className="aviso aviso--erro" role="alert">{loadError} <button onClick={() => void load()}>Tentar novamente</button></div>}
    {loading ? <p role="status">Carregando participantes…</p> : !loadError && trip && <>
      <HistoricoViagem tripId={tripId} times={trip} onSaved={() => load()} />
      <section className="cartao" aria-label="Ocupação"><h2>Ocupação do veículo</h2><p>Capacidade: <strong>{trip.vehicle.capacity}</strong> · Pacientes: <strong>{active.length}</strong> · Acompanhantes: <strong>{companionCount}</strong> · Vagas disponíveis: <strong>{available}</strong></p><button className="botao botao--secundario" disabled={saving} onClick={() => void load()}>Atualizar</button></section>
      {editable && !form && <button className="botao botao--primario" disabled={saving || available <= 0} onClick={() => { setEditing(null); setForm({ ...empty }); setCompanionForm(null); setCancelling(null); setError(''); }}>Adicionar paciente</button>}
      {!editable && <p>Os dados planejados só podem ser alterados em viagens agendadas.</p>}
      {form && editable && <form className="cartao" onSubmit={saveConsultation}><fieldset disabled={saving}><legend>{editing ? 'Editar participação' : 'Adicionar paciente'}</legend>
        {!editing && <><Campo id="buscar-paciente" type="search" rotulo="Pesquisar pacientes cadastrados" value={patients.q} onChange={e => patients.search(e.target.value)} />
          {patients.loading ? <p role="status">Buscando pacientes…</p> : patients.error ? <p role="alert">{patients.error}</p> : <><label htmlFor="paciente">Paciente</label><select id="paciente" required value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}><option value="">Selecione</option>{patients.data.map(p => <option key={p.id} value={p.id} disabled={!p.isActive || items.some(item => item.patientId === p.id)}>{p.name}{!p.isActive ? ' (inativo)' : items.some(item => item.patientId === p.id) ? ' (já associado)' : ''}</option>)}</select>{patients.data.length === 0 && <p>Nenhum paciente encontrado.</p>}</>}
          <Paginacao page={patients.page} totalPages={patients.totalPages} onGoTo={p => { setForm({ ...form, patientId: '' }); patients.goTo(p); }} />
        </>}
        <div className="grade">
          <Campo id="estabelecimento" rotulo="Estabelecimento" required maxLength={200} value={form.appointmentLocationName} onChange={e => setForm({ ...form, appointmentLocationName: e.target.value })} />
          <Campo id="endereco-consulta" rotulo="Endereço da consulta" required maxLength={300} value={form.appointmentAddress} onChange={e => setForm({ ...form, appointmentAddress: e.target.value })} />
          <Campo id="municipio-consulta" rotulo="Município" required maxLength={100} value={form.appointmentMunicipality} onChange={e => setForm({ ...form, appointmentMunicipality: e.target.value })} />
          <Campo id="horario-consulta" rotulo="Data e horário da consulta" type="datetime-local" required value={form.appointmentAt} onChange={e => setForm({ ...form, appointmentAt: e.target.value })} />
          <label>Prioridade<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>{Object.entries(priorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <Campo id="justificativa" rotulo="Justificativa da prioridade" required maxLength={500} value={form.priorityJustification} onChange={e => setForm({ ...form, priorityJustification: e.target.value })} />
        </div><p>O responsável e o instante da definição são registrados pelo servidor.</p>
        <div className="acoes"><button className="botao botao--primario" disabled={(!editing && (!form.patientId || patients.loading)) || !form.priorityJustification.trim()}>Salvar participação</button><button type="button" className="botao botao--secundario" onClick={() => setForm(null)}>Voltar</button></div>
      </fieldset></form>}
      {cancelling && editable && <form className="cartao" onSubmit={e => { e.preventDefault(); void mutate(`/patient-trips/${cancelling.id}/cancel`, 'PATCH', { reason: reason.trim() }); }}><h2>Cancelar participação de {cancelling.patient.name}</h2><p>O registro será preservado e a vaga será liberada.</p><Campo id="motivo-cancelamento" rotulo="Motivo" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /><button disabled={saving || !reason.trim()}>Confirmar cancelamento</button><button type="button" disabled={saving} onClick={() => setCancelling(null)}>Voltar</button></form>}
      {companionForm && editable && <form className="cartao" onSubmit={e => { e.preventDefault(); void mutate(`/patient-trips/${companionForm.patientTripId}/companions${companionForm.id ? `/${companionForm.id}` : ''}`, companionForm.id ? 'PATCH' : 'POST', { name: companionForm.name.trim(), phone: companionForm.phone.trim(), relationship: companionForm.relationship.trim() }); }}><fieldset disabled={saving}><legend>{companionForm.id ? 'Editar acompanhante' : 'Cadastrar acompanhante'}</legend><p>Paciente: {items.find(item => item.id === companionForm.patientTripId)?.patient.name}</p><Campo id="nome-acompanhante" rotulo="Nome" required minLength={2} maxLength={120} value={companionForm.name} onChange={e => setCompanionForm({ ...companionForm, name: e.target.value })} /><Campo id="telefone-acompanhante" rotulo="Telefone" type="tel" required minLength={8} maxLength={20} value={companionForm.phone} onChange={e => setCompanionForm({ ...companionForm, phone: e.target.value })} /><Campo id="parentesco" rotulo="Parentesco (opcional)" maxLength={60} value={companionForm.relationship} onChange={e => setCompanionForm({ ...companionForm, relationship: e.target.value })} /><button className="botao botao--primario">Salvar acompanhante</button><button type="button" className="botao botao--secundario" onClick={() => setCompanionForm(null)}>Voltar</button></fieldset></form>}
      <section className="cartao"><h2>Lista de participantes</h2>{items.length === 0 && <p>Nenhum paciente associado à viagem.</p>}
        {items.map(item => <article key={item.id} className="cartao"><h3>{item.patient.name} {item.cancelledAt && <span className="status status--erro">Participação cancelada</span>}</h3><p>Telefone: {item.patient.phone ?? 'Não informado'}</p><p>{item.appointmentLocationName ?? 'Estabelecimento não informado'} · {item.appointmentAddress} · {item.appointmentMunicipality} · {item.appointmentAt ? dateLabel(item.appointmentAt) : 'Horário não informado'}</p><p>Prioridade: <strong>{priorities[item.priority]}</strong> · {item.priorityJustification}</p><p>Definida por {item.priorityDefinedBy.name} em {dateLabel(item.priorityDefinedAt)}</p><p>Confirmação: {confirmations[item.confirmationStatus] ?? item.confirmationStatus}</p>
          {item.cancelledAt && <p>Cancelada em {dateLabel(item.cancelledAt)}: {item.cancellationReason}</p>}
          {(companions[item.id] ?? []).map(c => <div key={c.id}><p>Acompanhante: {c.name} · {c.phone} {c.relationship && `· ${c.relationship}`}</p>{editable && !item.cancelledAt && <><button className="link" disabled={saving} onClick={() => { setForm(null); setCancelling(null); setCompanionForm({ patientTripId: item.id, id: c.id, name: c.name, phone: c.phone, relationship: c.relationship ?? '' }); }}>Editar acompanhante</button><button className="link" disabled={saving} onClick={() => { if (window.confirm('Remover este acompanhante? O registro será preservado no histórico.')) void mutate(`/patient-trips/${item.id}/companions/${c.id}`, 'DELETE'); }}>Remover acompanhante</button></>}</div>)}
          {editable && !item.cancelledAt && <div className="acoes"><button className="link" disabled={saving} onClick={() => edit(item)}>Editar consulta e prioridade</button><button className="link" disabled={saving} onClick={() => { setForm(null); setCompanionForm(null); setReason(''); setCancelling(item); }}>Cancelar participação</button>{item._count.companions === 0 && <button className="link" disabled={saving || available <= 0} onClick={() => { setForm(null); setCancelling(null); setCompanionForm({ patientTripId: item.id, name: '', phone: '', relationship: '' }); }}>Adicionar acompanhante</button>}</div>}
        </article>)}
      </section>
    </>}
  </>;
}
