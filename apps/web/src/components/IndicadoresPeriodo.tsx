import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiErrorMessage, apiRequest } from '../services/api';

interface Analytics {
  total: number; scheduled: number; inProgress: number; completed: number; cancelled: number;
  activeVehicles: number; totalVehicles: number; plannedSeats: number; capacity: number;
  boardedPatients: number; occupancy: number | null;
  municipalities: { name: string; total: number }[];
  months: { month: string; total: number }[];
  vehicles: { plate: string; viagens: number; lugares: number; capacidade: number }[];
}
function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export default function IndicadoresPeriodo() {
  const now = new Date();
  const [start, setStart] = useState(() => localDate(new Date(now.getFullYear(), now.getMonth() - 5, 1)));
  const [end, setEnd] = useState(() => localDate(now));
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!start || !end || start > end) { setLoading(false); setError('Selecione um período válido.'); return; }
    const controller = new AbortController();
    const first = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`); last.setDate(last.getDate() + 1);
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) { setLoading(false); setError('Selecione um período válido.'); return; }
    const params = new URLSearchParams({ start: first.toISOString(), end: last.toISOString() });
    setLoading(true); setError('');
    apiRequest<Analytics>(`/analytics/dashboard?${params}`, { signal: controller.signal })
      .then(setData).catch(cause => { if (!controller.signal.aborted) setError(apiErrorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [start, end]);
  const monthly = data && start && end && start <= end ? (() => {
    const totals = new Map(data.months.map(item => [item.month, item.total]));
    const [year, month] = start.split('-').map(Number);
    const current = new Date(year, month - 1, 1);
    const finalMonth = end.slice(0, 7);
    const result: { month: string; total: number }[] = [];
    while (localDate(current).slice(0, 7) <= finalMonth && result.length < 1200) {
      const key = localDate(current).slice(0, 7);
      result.push({ month: key, total: totals.get(key) ?? 0 });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  })() : [];
  return <>
    <div className="filtros">
      <div className="campo"><label htmlFor="indicadores-inicio">De</label><input id="indicadores-inicio" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
      <div className="campo"><label htmlFor="indicadores-fim">Até</label><input id="indicadores-fim" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
    </div>
    {loading ? <p role="status">Carregando indicadores…</p> : error ? <div className="aviso aviso--erro" role="alert">{error}</div> : data && <>
      <section className="indicadores" aria-label="Resumo do período">
        <div className="cartao indicador"><span>Viagens no período</span><strong>{data.total}</strong><small>{data.scheduled} agendadas · {data.inProgress} em andamento</small></div>
        <div className="cartao indicador"><span>Viagens concluídas</span><strong>{data.completed}</strong><small>{data.cancelled} canceladas</small></div>
        <div className="cartao indicador"><span>Ocupação planejada</span><strong>{data.occupancy === null ? '—' : `${data.occupancy.toLocaleString('pt-BR')}%`}</strong><small>{data.plannedSeats} de {data.capacity} lugares</small></div>
        <div className="cartao indicador"><span>Pacientes com embarque registrado</span><strong>{data.boardedPatients}</strong><small>{data.activeVehicles} de {data.totalVehicles} veículos ativos atualmente</small></div>
      </section>
      <p className="texto-suave">Ocupação planejada: pacientes e acompanhantes ativos divididos pela capacidade somada das viagens não canceladas. O embarque de acompanhantes não é registrado; não há taxa realizada completa.</p>
      {data.total === 0 ? <p className="texto-suave">Nenhuma viagem no período selecionado.</p> : <div className="duas-colunas duas-colunas--iguais" style={{ marginTop: 16 }}>
        <section className="cartao"><h2 className="cartao__titulo">Viagens por município</h2><p className="texto-suave">Uma viagem é contada uma vez em cada município de consulta informado, inclusive se cancelada.</p>
          {data.municipalities.length === 0 ? <p>Sem municípios informados no período.</p> : <div style={{ width: '100%', height: 300 }}><ResponsiveContainer><BarChart data={data.municipalities} margin={{ bottom: 35 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={70} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" name="Viagens" fill="#1f5fa8" /></BarChart></ResponsiveContainer></div>}
        </section>
        <section className="cartao"><h2 className="cartao__titulo">Evolução mensal das viagens</h2><p className="texto-suave">Pela data de saída planejada, incluindo viagens canceladas.</p><div style={{ width: '100%', height: 300 }}><ResponsiveContainer><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="total" name="Viagens" stroke="#1f5fa8" /></LineChart></ResponsiveContainer></div></section>
        <section className="cartao"><h2 className="cartao__titulo">Ocupação planejada por veículo</h2><div style={{ width: '100%', height: 300 }}><ResponsiveContainer><BarChart data={data.vehicles.map(v => ({ ...v, taxa: v.capacidade ? Math.round(v.lugares / v.capacidade * 1000) / 10 : 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="plate" /><YAxis unit="%" /><Tooltip /><Bar dataKey="taxa" name="Ocupação planejada (%)" fill="#1e7b4f" /></BarChart></ResponsiveContainer></div></section>
      </div>}
    </>}
  </>;
}
