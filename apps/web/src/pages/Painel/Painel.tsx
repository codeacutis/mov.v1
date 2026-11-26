import AppLayout from '../../components/AppLayout';
import IndicadoresPeriodo from '../../components/IndicadoresPeriodo';
import './Painel.css';

export default function Painel({ onNavegar, onSair }: { onNavegar: (item: string) => void; onSair: () => void }) {
  return <AppLayout ativo="Painel" onNavegar={onNavegar} onSair={onSair}>
    <header className="cabecalho"><h1>Painel administrativo</h1><p>Indicadores do transporte municipal.</p></header>
    <IndicadoresPeriodo />
  </AppLayout>;
}
