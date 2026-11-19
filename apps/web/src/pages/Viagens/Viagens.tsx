import './Viagens.css';
import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import FormularioViagem from '../../components/FormularioViagem';
import GerenciarParadas from '../GerenciarParadas/GerenciarParadas';
import Paginacao from '../../components/Paginacao';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface ViagensProps {
  iniciarCriando?: boolean;
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';
type Aba = 'todas' | 'hoje' | 'sem-motorista';

interface Trip {
  id: string;
  plannedDepartureAt: string;
  municipalPickupPoint: string;
  status: TripStatus;
  vehicle: { id: string; plate: string };
  driver: { id: string; user: { name: string } };
  _count?: { patientTrips: number };
}

const STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  INTERRUPTED: 'Interrompida',
};

const STATUS_CLASS: Record<TripStatus, string> = {
  SCHEDULED: 'status--info',
  IN_PROGRESS: 'status--ok',
  COMPLETED: 'status--ok',
  CANCELLED: 'status--erro',
  INTERRUPTED: 'status--alerta',
};

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'sem-motorista', rotulo: 'Sem motorista' },
];

function isToday(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function Viagens({ iniciarCriando = false, onNavegar, onSair }: ViagensProps) {
  const { data: trips, loading, error: listError, page, totalPages, q, search, goTo, reload } =
    usePaginatedList<Trip>('/trips');
  const [criando, setCriando] = useState(iniciarCriando);
  const [paradaTrip, setParadaTrip] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [aba, setAba] = useState<Aba>('todas');

  const visiveis = trips.filter((t) => {
    if (aba === 'hoje' && !isToday(t.plannedDepartureAt)) return false;
    if (aba === 'sem-motorista' && t.driver !== null) return false;
    return true;
  });

  function navegar(item: string) {
    if (item === 'Viagens') { setCriando(false); setNotice(''); }
    onNavegar(item);
  }

  function aoConcluirFormulario(salvou: boolean) {
    setCriando(false);
    if (salvou) {
      setNotice('Viagem cadastrada com sucesso.');
      reload();
    }
  }

  return (
    <AppLayout ativo="Viagens" onNavegar={navegar} onSair={onSair}>
      {paradaTrip ? (
        <GerenciarParadas tripId={paradaTrip} onVoltar={() => setParadaTrip(null)} />
      ) : criando ? (
        <FormularioViagem onConcluir={aoConcluirFormulario} />
      ) : (
        <>
          <header className="cabecalho cabecalho--linha">
            <div>
              <h1>Viagens</h1>
              <p>Todas as viagens programadas e realizadas</p>
            </div>
            <div className="cabecalho__acoes">
              <button type="button" className="botao botao--primario"
                onClick={() => { setNotice(''); setCriando(true); }}>
                Nova viagem
              </button>
            </div>
          </header>

          {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
          {listError && <div className="aviso aviso--erro" role="alert">{listError}</div>}

          <div className="abas" role="group" aria-label="Filtrar por grupo">
            {ABAS.map((a) => (
              <button key={a.id} type="button"
                className={a.id === aba ? 'aba aba--ativa' : 'aba'}
                aria-pressed={a.id === aba}
                onClick={() => setAba(a.id)}>
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="filtros">
            <input type="search" className="filtro"
              aria-label="Buscar por placa, motorista ou local"
              placeholder="Buscar por placa, motorista ou local"
              value={q} onChange={(e) => search(e.target.value)} />
          </div>

          <section className="cartao">
            {loading ? (
              <p role="status">Carregando viagens…</p>
            ) : (
              <div className="tabela-rolagem">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Saída</th>
                      <th>Local de saída</th>
                      <th>Veículo</th>
                      <th>Motorista</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDateTime(t.plannedDepartureAt)}</td>
                        <td>{t.municipalPickupPoint}</td>
                        <td>{t.vehicle?.plate ?? '—'}</td>
                        <td>{t.driver?.user.name ?? <span className="status status--alerta">Sem motorista</span>}</td>
                        <td>
                          <span className={`status ${STATUS_CLASS[t.status]}`}>
                            {STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td>
                          <button className="link" type="button" onClick={() => setParadaTrip(t.id)}>
                            Paradas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visiveis.length === 0 && (
                  <p className="texto-suave" style={{ margin: '16px 10px 4px' }}>
                    Nenhuma viagem encontrada.
                  </p>
                )}
              </div>
            )}
            <Paginacao page={page} totalPages={totalPages} onGoTo={goTo} />
            <button type="button" className="botao botao--secundario"
              onClick={reload} disabled={loading} style={{ marginTop: 12 }}>
              Atualizar lista
            </button>
          </section>
        </>
      )}
    </AppLayout>
  );
}
