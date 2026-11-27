import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import HistoricoViagem from '../../components/HistoricoViagem';
import Campo from '../../components/Campo';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { telefoneAcompanhante } from '../../utils/telefone-acompanhante';
import './DetalhesViagem.css';

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
interface Trip { actualDepartureAt: string | null; actualReturnStartAt: string | null; actualReturnAt: string | null; status: string; municipalPickupPoint: string; plannedDepartureAt: string; vehicle: { plate: string; description?: string | null; capacity: number } }
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
  const editorRef = useRef<HTMLFormElement>(null);
  const editorKey = form ? `participation-${editing ?? 'new'}` : companionForm ? `companion-${companionForm.patientTripId}-${companionForm.id ?? 'new'}` : cancelling ? `cancel-${cancelling.id}` : null;
  useEffect(() => {
    if (editorKey) editorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [editorKey]);
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
  const appointmentInvalid = !!form?.appointmentAt && !!trip && new Date(form.appointmentAt) < new Date(trip.plannedDepartureAt);

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
    if (appointmentInvalid || !Number.isFinite(new Date(form.appointmentAt).getTime())) {
      setError('A consulta deve ter data e horário válidos, iguais ou posteriores à saída planejada da viagem.');
      return;
    }
    const { patientId, ...fields } = form;
    const payload = { ...fields, appointmentLocationName: fields.appointmentLocationName.trim(), appointmentAddress: fields.appointmentAddress.trim(), appointmentMunicipality: fields.appointmentMunicipality.trim(), priorityJustification: fields.priorityJustification.trim(), appointmentAt: new Date(fields.appointmentAt).toISOString() };
    void mutate(editing ? `/patient-trips/${editing}` : `/trips/${tripId}/patient-trips`, editing ? 'PATCH' : 'POST', editing ? payload : { ...payload, patientId });
  }

  return <div className="participantes">
    <header className="cabecalho cabecalho--linha">
      <div><p className="sobretitulo">Planejamento de passageiros</p><h1>Participantes da viagem</h1>
        {trip && <p>{trip.municipalPickupPoint} · {dateLabel(trip.plannedDepartureAt)} · {trip.vehicle.description?.trim() || trip.vehicle.plate}</p>}
      </div>
      <button className="botao botao--secundario" disabled={saving} onClick={onVoltar}>Voltar para viagens</button>
    </header>
    {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
    {error && <div className="aviso aviso--erro" role="alert">{error}</div>}
    {loadError && <div className="aviso aviso--erro" role="alert">{loadError} <button onClick={() => void load()}>Tentar novamente</button></div>}
    {loading ? <p role="status">Carregando participantes…</p> : !loadError && trip && <>
      <section className="cartao participantes__ocupacao" aria-label="Ocupação">
        <div className="participantes__titulo"><div><h2>Ocupação do veículo</h2><p>Pacientes e acompanhantes compartilham a capacidade disponível.</p></div>
          <button className="botao botao--secundario" disabled={saving} onClick={() => void load()}>Atualizar</button>
        </div>
        <dl className="participantes__metricas">
          <div><dt>Capacidade total</dt><dd>{trip.vehicle.capacity}</dd></div><div><dt>Pacientes</dt><dd>{active.length}</dd></div>
          <div><dt>Acompanhantes</dt><dd>{companionCount}</dd></div><div className="participantes__vagas"><dt>Vagas disponíveis</dt><dd>{available}</dd></div>
        </dl>
      </section>
      <div className="participantes__titulo"><div><h2>Lista de participantes</h2><p>{active.length} participação(ões) ativa(s). Gerencie a consulta e o acompanhante de cada paciente.</p></div>
        {editable && !form && <button className="botao botao--primario" disabled={saving || available <= 0} onClick={() => {
          setEditing(null); setForm({ ...empty, appointmentAt: localDate(trip.plannedDepartureAt) }); patients.search(''); patients.goTo(1);
          setCompanionForm(null); setCancelling(null); setError('');
        }}>Adicionar paciente</button>}
      </div>
      {!editable && <p>Os dados planejados só podem ser alterados em viagens agendadas.</p>}
      {editable && available <= 0 && <p className="participantes__dica">Veículo sem vagas disponíveis para novos pacientes ou acompanhantes.</p>}

      {form && editable && <form ref={editorRef} className="cartao participantes__formulario" aria-label={editing ? 'Editar participação' : 'Adicionar paciente'} onSubmit={saveConsultation}>
        <fieldset disabled={saving}>
          <legend>{editing ? 'Editar participação' : 'Adicionar paciente'}</legend>
          <p className="participantes__dica">Preencha os dados abaixo para organizar o atendimento nesta viagem.</p>
          {!editing ? <section className="participantes__bloco" aria-labelledby="selecao-titulo">
            <h3 id="selecao-titulo"><span>1</span> Selecione o paciente</h3>
            <div className="participantes__busca"><Campo id="buscar-paciente" type="search" rotulo="Pesquisar pacientes cadastrados" placeholder="Digite o nome, telefone ou cartão SUS" value={patients.q} aria-controls="resultados-pacientes" onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} onChange={e => { patients.search(e.target.value); setForm({ ...form, patientId: '' }); }} />
              {patients.q && <button type="button" className="botao botao--secundario" onClick={() => { patients.search(''); setForm({ ...form, patientId: '' }); }}>Limpar busca</button>}
            </div>
            <div id="resultados-pacientes" className="participantes__resultados" aria-busy={patients.loading}>
              {patients.loading ? <p role="status">Buscando pacientes…</p> : patients.error ? <div role="alert">{patients.error} <button type="button" className="link" onClick={patients.reload}>Tentar buscar novamente</button></div> : <>
                <p className="participantes__dica" role="status">{patients.total ? `${patients.total} paciente(s) encontrado(s). Selecione um resultado.` : 'Nenhum paciente encontrado. Tente outro nome ou telefone.'}</p>
                <div className="participantes__opcoes" role="radiogroup" aria-label="Pacientes encontrados">
                  {patients.data.map(patient => {
                    const associated = items.some(item => item.patientId === patient.id);
                    return <label key={patient.id} className={`participantes__opcao${form.patientId === patient.id ? ' participantes__opcao--selecionada' : ''}`}>
                      <input type="radio" name="paciente" required disabled={!patient.isActive || associated} value={patient.id} checked={form.patientId === patient.id} onChange={() => setForm({ ...form, patientId: patient.id })} />
                      <span><strong>{patient.name}</strong><small>{!patient.isActive ? 'Cadastro inativo' : associated ? 'Já associado a esta viagem' : 'Disponível para incluir'}</small></span>
                    </label>;
                  })}
                </div>
                <Paginacao page={patients.page} totalPages={patients.totalPages} onGoTo={page => { setForm({ ...form, patientId: '' }); patients.goTo(page); }} />
              </>}
            </div>
          </section> : <p className="participantes__paciente-editado">Paciente: <strong>{items.find(item => item.id === editing)?.patient.name}</strong></p>}

          <section className="participantes__bloco" aria-labelledby="consulta-titulo">
            <h3 id="consulta-titulo"><span>{editing ? '1' : '2'}</span> Informações da consulta</h3>
            <p className="participantes__dica">Saída planejada: <strong>{dateLabel(trip.plannedDepartureAt)}</strong>. A consulta deve ocorrer a partir desse horário.</p>
            <div className="grade">
              <Campo id="estabelecimento" rotulo="Estabelecimento" required maxLength={200} value={form.appointmentLocationName} onChange={e => setForm({ ...form, appointmentLocationName: e.target.value })} />
              <Campo id="municipio-consulta" rotulo="Município" required maxLength={100} value={form.appointmentMunicipality} onChange={e => setForm({ ...form, appointmentMunicipality: e.target.value })} />
              <Campo id="endereco-consulta" rotulo="Endereço da consulta" required maxLength={300} value={form.appointmentAddress} onChange={e => setForm({ ...form, appointmentAddress: e.target.value })} />
              <Campo id="horario-consulta" rotulo="Data e horário da consulta" type="datetime-local" min={localDate(trip.plannedDepartureAt)} required aria-invalid={appointmentInvalid || undefined} aria-describedby="consulta-limite" value={form.appointmentAt} onChange={e => setForm({ ...form, appointmentAt: e.target.value })} />
            </div>
            <p id="consulta-limite" className={appointmentInvalid ? 'aviso aviso--erro' : 'participantes__dica'} role={appointmentInvalid ? 'alert' : undefined}>{appointmentInvalid ? 'A consulta não pode ser anterior à saída planejada da viagem.' : 'Confira o dia e o horário da consulta antes de salvar.'}</p>
          </section>
          <section className="participantes__bloco" aria-labelledby="prioridade-titulo">
            <h3 id="prioridade-titulo"><span>{editing ? '2' : '3'}</span> Prioridade da participação</h3>
            <div className="grade">
              <div className="campo"><label htmlFor="prioridade">Prioridade</label><select id="prioridade" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>{Object.entries(priorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <Campo id="justificativa" rotulo="Justificativa da prioridade" required maxLength={500} value={form.priorityJustification} onChange={e => setForm({ ...form, priorityJustification: e.target.value })} />
            </div><p className="participantes__dica">O responsável e o instante da definição são registrados pelo servidor.</p>
          </section>
          <div className="participantes__acoes participantes__rodape"><button className="botao botao--secundario" type="button" onClick={() => setForm(null)}>Fechar formulário</button><button className="botao botao--primario" disabled={appointmentInvalid || (!editing && (!form.patientId || patients.loading)) || !form.priorityJustification.trim()}>{saving ? 'Salvando…' : 'Salvar participação'}</button></div>
        </fieldset>
      </form>}

      {cancelling && editable && <form ref={editorRef} className="cartao participantes__formulario" onSubmit={e => { e.preventDefault(); void mutate(`/patient-trips/${cancelling.id}/cancel`, 'PATCH', { reason: reason.trim() }); }}>
        <h2>Cancelar participação de {cancelling.patient.name}</h2><p>O registro será preservado e a vaga será liberada.</p>
        <Campo id="motivo-cancelamento" rotulo="Motivo" required disabled={saving} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
        <div className="participantes__acoes"><button type="button" className="botao botao--secundario" disabled={saving} onClick={() => setCancelling(null)}>Voltar</button><button className="botao botao--primario" disabled={saving || !reason.trim()}>Confirmar cancelamento</button></div>
      </form>}
      {companionForm && editable && <form ref={editorRef} className="cartao participantes__formulario" aria-label="Acompanhante" onSubmit={e => { e.preventDefault(); void mutate(`/patient-trips/${companionForm.patientTripId}/companions${companionForm.id ? `/${companionForm.id}` : ''}`, companionForm.id ? 'PATCH' : 'POST', { name: companionForm.name.trim(), phone: companionForm.phone.trim(), relationship: companionForm.relationship.trim() }); }}>
        <fieldset disabled={saving}><legend>{companionForm.id ? 'Editar acompanhante' : 'Cadastrar acompanhante'}</legend>
          <p className="participantes__paciente-editado">Paciente: <strong>{items.find(item => item.id === companionForm.patientTripId)?.patient.name}</strong></p>
          <div className="grade">
            <Campo id="nome-acompanhante" rotulo="Nome" required minLength={2} maxLength={120} value={companionForm.name} onChange={e => setCompanionForm({ ...companionForm, name: e.target.value })} />
            <Campo id="telefone-acompanhante" rotulo="Telefone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(00) 0 0000 - 0000" required minLength={8} maxLength={20} value={companionForm.phone} onChange={e => setCompanionForm({ ...companionForm, phone: telefoneAcompanhante(e.target.value) })} />
            <Campo id="parentesco" rotulo="Parentesco (opcional)" maxLength={60} value={companionForm.relationship} onChange={e => setCompanionForm({ ...companionForm, relationship: e.target.value })} />
          </div>
          <div className="participantes__acoes participantes__rodape"><button type="button" className="botao botao--secundario" onClick={() => setCompanionForm(null)}>Fechar formulário</button><button className="botao botao--primario">{saving ? 'Salvando…' : 'Salvar acompanhante'}</button></div>
        </fieldset>
      </form>}

      <section className="participantes__lista" aria-label="Participantes associados">
        {items.length === 0 && <div className="cartao participantes__vazio"><h3>A lista de passageiros está vazia</h3><p>Use “Adicionar paciente” para selecionar um cadastro e informar a consulta.</p></div>}
        {items.map(item => <article key={item.id} className="cartao participantes__cartao">
          <header className="participantes__titulo"><div><h3>{item.patient.name}</h3><p>Telefone: {item.patient.phone ?? 'Não informado'}</p></div>
            <span className={`participantes__etiqueta${item.cancelledAt ? '' : ` participantes__etiqueta--${item.priority.toLowerCase()}`}`}>{item.cancelledAt ? 'Participação cancelada' : `Prioridade ${priorities[item.priority].toLowerCase()}`}</span>
          </header>
          <div className="participantes__dados">
            <section><h4>Consulta</h4><p><strong>{item.appointmentLocationName ?? 'Estabelecimento não informado'}</strong></p><p>{item.appointmentAddress} · {item.appointmentMunicipality}</p><p>{item.appointmentAt ? dateLabel(item.appointmentAt) : 'Horário não informado'}</p></section>
            <section><h4>Prioridade e confirmação</h4><p>{item.priorityJustification}</p><p className="participantes__dica">Definida por {item.priorityDefinedBy.name} em {dateLabel(item.priorityDefinedAt)}</p><p>Confirmação: <strong>{confirmations[item.confirmationStatus] ?? item.confirmationStatus}</strong></p></section>
          </div>
          {item.cancelledAt && <p className="participantes__dica">Cancelada em {dateLabel(item.cancelledAt)}: {item.cancellationReason}</p>}
          <section className="participantes__acompanhante"><h4>Acompanhante</h4>
            {!companions[item.id]?.length && <p className="participantes__dica">Nenhum acompanhante cadastrado.</p>}
            {(companions[item.id] ?? []).map(companion => <div key={companion.id}><p><strong>{companion.name}</strong> · {telefoneAcompanhante(companion.phone)} {companion.relationship && `· ${companion.relationship}`}</p>
              {editable && !item.cancelledAt && <div className="participantes__acoes">
                <button className="botao botao--secundario" disabled={saving} onClick={() => { setForm(null); setCancelling(null); setCompanionForm({ patientTripId: item.id, id: companion.id, name: companion.name, phone: telefoneAcompanhante(companion.phone), relationship: companion.relationship ?? '' }); }}>Editar acompanhante</button>
                <button className="botao botao--secundario" disabled={saving} onClick={() => { if (window.confirm('Remover este acompanhante? O registro será preservado no histórico.')) void mutate(`/patient-trips/${item.id}/companions/${companion.id}`, 'DELETE'); }}>Remover acompanhante</button>
              </div>}
            </div>)}
          </section>
          {editable && !item.cancelledAt && <footer className="participantes__acoes participantes__rodape">
            <button className="botao botao--secundario" disabled={saving} onClick={() => edit(item)}>Editar consulta e prioridade</button>
            {item._count.companions === 0 && <button className="botao botao--secundario" disabled={saving || available <= 0} onClick={() => { setForm(null); setCancelling(null); setCompanionForm({ patientTripId: item.id, name: '', phone: '', relationship: '' }); }}>Adicionar acompanhante</button>}
            <button className="link" disabled={saving} onClick={() => { setForm(null); setCompanionForm(null); setReason(''); setCancelling(item); }}>Cancelar participação</button>
          </footer>}
        </article>)}
      </section>
      <details className="participantes__historico"><summary>Ver histórico operacional e horários reais</summary><HistoricoViagem tripId={tripId} times={trip} onSaved={() => load()} /></details>
    </>}
  </div>;
}
