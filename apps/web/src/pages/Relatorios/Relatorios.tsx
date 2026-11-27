import { useEffect, useState } from 'react';
import Auditoria from '../../components/Auditoria';
import AppLayout from '../../components/AppLayout';
import IndicadoresPeriodo from '../../components/IndicadoresPeriodo';
import { apiDownload, apiErrorMessage, apiRequest, fetchAllPages } from '../../services/api';
import './Relatorios.css';

type Row = { id: string; status: string; plannedDepartureAt: string; plannedReturnStartAt: string; actualDepartureAt: string | null; actualReturnStartAt: string | null; actualReturnAt: string | null; municipalities: string[]; plate: string; driver: string; patients: number; companions: number; capacity: number; occupancy: number | null };
type Vehicle = { id: string; plate: string };
type Driver = { id: string; user: { name: string } };
const statuses: Record<string, string> = { SCHEDULED: 'Agendada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada', INTERRUPTED: 'Interrompida' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export default function Relatorios({ onNavegar, onSair }: { onNavegar: (item: string) => void; onSair: () => void }) {
  const [start, setStart] = useState(() => `${today().slice(0, 7)}-01`);
  const [end, setEnd] = useState(today);
  const [municipality, setMunicipality] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [status, setStatus] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [optionError, setOptionError] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [applied, setApplied] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchAllPages<Vehicle>('/vehicles', controller.signal), fetchAllPages<Driver>('/drivers', controller.signal)])
      .then(([v, d]) => { setVehicles(v); setDrivers(d); })
      .catch(e => { if (!controller.signal.aborted) setOptionError(apiErrorMessage(e)); });
    return () => controller.abort();
  }, []);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end || start > end) { setError('Selecione um período válido.'); return; }
    const first = new Date(`${start}T00:00:00-03:00`);
    const last = new Date(`${end}T00:00:00-03:00`); last.setUTCDate(last.getUTCDate() + 1);
    const params = new URLSearchParams({ start: first.toISOString(), end: last.toISOString() });
    if (municipality.trim()) params.set('municipality', municipality.trim());
    if (vehicleId) params.set('vehicleId', vehicleId);
    if (driverId) params.set('driverId', driverId);
    if (status) params.set('status', status);
    setLoading(true); setRows(null); setError(''); setApplied('');
    try {
      const result = await apiRequest<Row[]>(`/reports/trips?${params}`);
      setRows(result); setApplied(params.toString());
      setDescription(`Período: ${start.split('-').reverse().join('/')} a ${end.split('-').reverse().join('/')} | Município: ${municipality.trim() || 'Todos'} | Veículo: ${vehicles.find(v => v.id === vehicleId)?.plate || 'Todos'} | Motorista: ${drivers.find(d => d.id === driverId)?.user.name || 'Todos'} | Situação: ${statuses[status] || 'Todas'}`);
    } catch (cause) { setError(apiErrorMessage(cause)); }
    finally { setLoading(false); }
  }
  async function exportExcel() {
    setExporting(true); setError('');
    try {
      const blob = await apiDownload(`/reports/trips.xlsx?${applied}`);
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'mov-viagens.xlsx'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (cause) { setError(apiErrorMessage(cause)); } finally { setExporting(false); }
  }
  async function exportPdf() {
    if (!rows) return;
    setExporting(true); setError('');
    try {
      const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
      pdfMake.addVirtualFileSystem(fonts);
      const headings = ['Saída / retorno planejados', 'Saída / retorno / chegada reais', 'Municípios', 'Veículo / motorista', 'Situação', 'Pac. / acomp.', 'Ocup. / capacidade'];
      const body = [headings.map(text => ({ text, bold: true, fillColor: '#dceaf3' })), ...rows.map(r => [ `${date(r.plannedDepartureAt)}\n${date(r.plannedReturnStartAt)}`, `${date(r.actualDepartureAt)}\n${date(r.actualReturnStartAt)}\n${date(r.actualReturnAt)}`, r.municipalities.join(', ') || '—', `${r.plate}\n${r.driver}`, statuses[r.status] || r.status, `${r.patients} / ${r.companions}`, `${r.occupancy === null ? '—' : `${r.occupancy}%`} / ${r.capacity}` ])];
      await pdfMake.createPdf({ pageOrientation: 'landscape', pageSize: 'A4', pageMargins: [30, 85, 30, 35], header: { text: `Mov+ — Relatório de viagens\n${description}\nEmitido em ${date(new Date().toISOString())}`, margin: [30, 20, 30, 0], fontSize: 9 }, footer: (currentPage: number, pageCount: number) => ({ text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', margin: [0, 0, 30, 0], fontSize: 8 }), content: [{ table: { headerRows: 1, widths: [100, 100, '*', 100, 65, 48, 65], body }, layout: 'lightHorizontalLines' }], defaultStyle: { fontSize: 8 } }).download('mov-viagens.pdf');
    } catch { setError('Não foi possível gerar ou baixar o PDF. Tente novamente.'); } finally { setExporting(false); }
  }
  return <AppLayout ativo="Relatórios" onNavegar={onNavegar} onSair={onSair}>
    <header className="cabecalho"><h1>Relatórios</h1><p>Indicadores e relatório de viagens.</p></header>
    <IndicadoresPeriodo />
    <section className="cartao relatorio-viagens"><h2>Relatório de viagens</h2>
      <p>O período considera a saída planejada. O município filtra viagens com ao menos uma participação ativa nesse destino; as contagens incluem todos os participantes ativos da viagem.</p>
      <p>Ocupação planejada: pacientes e acompanhantes ativos divididos pela capacidade atual do veículo. Não representa embarques realizados.</p>
      {optionError && <p role="alert">Não foi possível carregar veículos e motoristas: {optionError}</p>}
      <form onSubmit={search}><div className="filtros">
        <div className="campo"><label htmlFor="rel-inicio">De</label><input id="rel-inicio" type="date" required value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="campo"><label htmlFor="rel-fim">Até</label><input id="rel-fim" type="date" required value={end} onChange={e => setEnd(e.target.value)} /></div>
        <div className="campo"><label htmlFor="rel-municipio">Município</label><input id="rel-municipio" maxLength={100} value={municipality} onChange={e => setMunicipality(e.target.value)} /></div>
        <div className="campo"><label htmlFor="rel-veiculo">Veículo</label><select id="rel-veiculo" value={vehicleId} onChange={e => setVehicleId(e.target.value)}><option value="">Todos</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></div>
        <div className="campo"><label htmlFor="rel-motorista">Motorista</label><select id="rel-motorista" value={driverId} onChange={e => setDriverId(e.target.value)}><option value="">Todos</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.user.name}</option>)}</select></div>
        <div className="campo"><label htmlFor="rel-status">Situação</label><select id="rel-status" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      </div><div className="cabecalho__acoes"><button className="botao" disabled={loading || exporting}>Consultar</button><button className="botao" type="button" disabled={!rows || exporting || loading} onClick={exportExcel}>Baixar Excel</button><button className="botao" type="button" disabled={!rows || exporting || loading} onClick={exportPdf}>Baixar PDF</button></div></form>
      {loading && <p role="status">Consultando viagens…</p>}{exporting && <p role="status">Gerando arquivo…</p>}{error && <p role="alert" className="aviso aviso--erro">{error}</p>}
      {rows && <><p>{description}</p><p>{rows.length} viagem(ns) encontrada(s).</p>{rows.length > 0 && <div className="tabela-rolagem"><table className="tabela"><thead><tr><th>Saída / retorno planejados</th><th>Saída / retorno / chegada reais</th><th>Municípios</th><th>Veículo / motorista</th><th>Situação</th><th>Pacientes / acompanhantes</th><th>Ocupação / capacidade</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{date(r.plannedDepartureAt)}<br />{date(r.plannedReturnStartAt)}</td><td>{date(r.actualDepartureAt)}<br />{date(r.actualReturnStartAt)}<br />{date(r.actualReturnAt)}</td><td>{r.municipalities.join(', ') || '—'}</td><td>{r.plate}<br />{r.driver}</td><td>{statuses[r.status] || r.status}</td><td>{r.patients} / {r.companions}</td><td>{r.occupancy === null ? '—' : `${r.occupancy}%`} / {r.capacity}</td></tr>)}</tbody></table></div>}</>}
    </section>
    <Auditoria />
  </AppLayout>;
}
