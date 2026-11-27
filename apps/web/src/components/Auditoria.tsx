import { useEffect, useState, type FormEvent } from 'react';
import { apiErrorMessage, apiRequest, type PageResult } from '../services/api';

type Entry = { id: string; actorUserId: string; actor: { name: string }; action: string; entityType: string; entityId: string; occurredAt: string; reason: string | null; changes: unknown };
export default function Auditoria() {
  const [q, setQ] = useState(''); const [action, setAction] = useState(''); const [entityType, setEntityType] = useState('');
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [filters, setFilters] = useState(''); const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Entry> | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    apiRequest<PageResult<Entry>>(`/audit?page=${page}&limit=20${filters}`, { signal: controller.signal })
      .then(setData).catch(e => { if (!controller.signal.aborted) { setData(null); setError(apiErrorMessage(e)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, filters]);
  function search(event: FormEvent) {
    event.preventDefault();
    if (start && end && start > end) { setError('Selecione um período válido.'); return; }
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim()); if (action.trim()) params.set('action', action.trim()); if (entityType.trim()) params.set('entityType', entityType.trim());
    if (start) params.set('start', new Date(`${start}T00:00:00`).toISOString());
    if (end) { const last = new Date(`${end}T00:00:00`); last.setDate(last.getDate() + 1); params.set('end', last.toISOString()); }
    setPage(1); setFilters(`&${params}`); setError('');
  }
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  return <section className="cartao relatorio-viagens"><h2>Auditoria</h2><p>Histórico somente para consulta. Pesquise pelo responsável, ação ou entidade.</p>
    <form onSubmit={search}><div className="filtros">
      <div className="campo"><label htmlFor="audit-q">Busca</label><input id="audit-q" value={q} maxLength={100} onChange={e => setQ(e.target.value)} /></div>
      <div className="campo"><label htmlFor="audit-action">Ação</label><input id="audit-action" value={action} maxLength={100} onChange={e => setAction(e.target.value)} /></div>
      <div className="campo"><label htmlFor="audit-entity">Entidade</label><input id="audit-entity" value={entityType} maxLength={100} onChange={e => setEntityType(e.target.value)} /></div>
      <div className="campo"><label htmlFor="audit-start">De</label><input id="audit-start" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
      <div className="campo"><label htmlFor="audit-end">Até</label><input id="audit-end" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
    </div><button className="botao botao--primario" disabled={loading}>Pesquisar auditoria</button></form>
    {loading ? <p role="status">Carregando auditoria…</p> : error ? <p role="alert">{error}</p> : data && <>
      <p>{data.total} registro(s) encontrado(s).</p>
      {data.data.map(entry => <article key={entry.id} className="cartao"><strong>{entry.action}</strong><p>{new Date(entry.occurredAt).toLocaleString('pt-BR')} · {entry.actor.name} · {entry.entityType}</p>
        <details><summary>Detalhes da operação</summary><p>Responsável: {entry.actor.name} ({entry.actorUserId})</p><p>Entidade: {entry.entityType} · {entry.entityId}</p>{entry.reason && <p>Justificativa: {entry.reason}</p>}<pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(entry.changes, null, 2)}</pre></details></article>)}
      <div className="acoes"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</button></div>
    </>}
  </section>;
}
