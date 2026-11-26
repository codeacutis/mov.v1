import AppLayout from '../../components/AppLayout';
import IndicadoresPeriodo from '../../components/IndicadoresPeriodo';
import './Relatorios.css';

export default function Relatorios({ onNavegar, onSair }: { onNavegar: (item: string) => void; onSair: () => void }) {
  return <AppLayout ativo="Relatórios" onNavegar={onNavegar} onSair={onSair}>
    <header className="cabecalho"><h1>Relatórios</h1><p>Indicadores de uso da frota e do transporte de pacientes.</p></header>
    <IndicadoresPeriodo />
  </AppLayout>;
}
