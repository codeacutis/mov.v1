import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Paginacao from './Paginacao';
import { apiErrorMessage, apiRequest, type PageResult } from '../services/api';
import './Auditoria.css';

type Entry = { id: string; actorUserId: string; actor: { name: string }; action: string; entityType: string; entityId: string; occurredAt: string; reason: string | null; changes: unknown };
type Options = { actions: string[]; entityTypes: string[] };
export default function Auditoria() {
  const [q, setQ] = useState(''); const [action, setAction] = useState(''); const [entityType, setEntityType] = useState('');
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [filters, setFilters] = useState(''); const [page, setPage] = useState(1); const [version, setVersion] = useState(0);
  const [options, setOptions] = useState<Options>({ actions: [], entityTypes: [] }); const [optionError, setOptionError] = useState('');
  const [data, setData] = useState<PageResult<Entry> | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const loadOptions = useCallback(async (signal?: AbortSignal) => {
    setOptionError('');
    try { const result = await apiRequest<Options>('/audit/options', { signal }); if (!signal?.aborted) setOptions(result); }
    catch (cause) { if (!signal?.aborted) setOptionError(apiErrorMessage(cause)); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void loadOptions(controller.signal); return () => controller.abort(); }, [loadOptions]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    apiRequest<PageResult<Entry>>(`/audit?page=${page}&limit=10${filters}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(cause => { if (!controller.signal.aborted) { setData(null); setError(apiErrorMessage(cause)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, filters, version]);
  function search(event: FormEvent) {
    event.preventDefault();
    if (start && end && start > end) { setError('Selecione um período válido.'); return; }
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim()); if (action) params.set('action', action); if (entityType) params.set('entityType', entityType);
    if (start) params.set('start', new Date(`${start}T00:00:00`).toISOString());
    if (end) { const last = new Date(`${end}T00:00:00`); last.setDate(last.getDate() + 1); params.set('end', last.toISOString()); }
    setPage(1); setFilters(params.size ? `&${params}` : ''); setVersion(value => value + 1); setError('');
  }
  function clearFilters() {
    setQ(''); setAction(''); setEntityType(''); setStart(''); setEnd(''); setFilters(''); setPage(1); setVersion(value => value + 1);
  }
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  return <section className="cartao relatorio-viagens auditoria" aria-labelledby="audit-title">
    <div className="auditoria__titulo"><div><h2 id="audit-title">Auditoria</h2><p className="texto-suave">Histórico de alterações. Abra os detalhes somente quando necessário.</p></div>{data && <span className="status status--info">{data.total} registro(s)</span>}</div>
    <form onSubmit={search} className="auditoria__filtros">
      <div className="campo"><label htmlFor="audit-q">Busca</label><input id="audit-q" placeholder="Responsável, ação ou entidade" value={q} maxLength={100} onChange={event => setQ(event.target.value)} /></div>
      <div className="campo"><label htmlFor="audit-action">Ação</label><select id="audit-action" value={action} onChange={event => setAction(event.target.value)}><option value="">Todas as ações</option>{options.actions.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="campo"><label htmlFor="audit-entity">Entidade</label><select id="audit-entity" value={entityType} onChange={event => setEntityType(event.target.value)}><option value="">Todas as entidades</option>{options.entityTypes.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="campo"><label htmlFor="audit-start">De</label><input id="audit-start" type="date" value={start} onChange={event => setStart(event.target.value)} /></div>
      <div className="campo"><label htmlFor="audit-end">Até</label><input id="audit-end" type="date" min={start || undefined} value={end} onChange={event => setEnd(event.target.value)} /></div>
      <div className="auditoria__acoes"><button className="botao botao--primario" disabled={loading}>Pesquisar auditoria</button><button type="button" className="botao botao--secundario" onClick={clearFilters}>Limpar filtros</button></div>
    </form>
    {optionError && <p role="alert">Não foi possível carregar as opções. {optionError} <button className="link" type="button" onClick={() => void loadOptions()}>Recarregar opções</button></p>}
    {error && <p role="alert">{error} <button className="link" type="button" onClick={() => setVersion(value => value + 1)}>Tentar novamente</button></p>}
    {loading ? <p role="status">Carregando auditoria…</p> : !error && data && <>
      {data.data.length === 0 ? <p className="texto-suave">Nenhum registro de auditoria encontrado para os filtros selecionados.</p> : <div className="tabela-rolagem auditoria__rolagem" tabIndex={0} aria-label="Registros de auditoria">
        <table className="tabela auditoria__tabela"><thead><tr><th>Data e hora</th><th>Responsável</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
          <tbody>{data.data.map(entry => <tr key={entry.id}>
            <td><time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></td>
            <td>{entry.actor.name}</td><td>{entry.action}</td><td>{entry.entityType}</td>
            <td><details><summary>Ver detalhes</summary><div className="auditoria__detalhes"><p>Responsável: {entry.actor.name} ({entry.actorUserId})</p><p>Entidade: {entry.entityType} · {entry.entityId}</p>{entry.reason && <p>Justificativa: {entry.reason}</p>}<pre>{JSON.stringify(entry.changes, null, 2)}</pre></div></details></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <Paginacao page={page} totalPages={totalPages} onGoTo={setPage} />
    </>}
  </section>;
}
