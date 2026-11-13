import './Viagens.css';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import FormularioViagem from '../../components/FormularioViagem';
import { apiRequest, ApiRequestError } from '../../services/api';

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
  vehicle: { id: string; plate: string } | null;
  driver: { id: string; user: { name: string } } | null;
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

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 401)
    return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error instanceof TypeError)
    return 'Não foi possível acessar a API. Confira se o backend está em execução.';
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

export default function Viagens({ iniciarCriando = false, onNavegar, onSair }: ViagensProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [criando, setCriando] = useState(iniciarCriando);
  const [notice, setNotice] = useState('');
  const [aba, setAba] = useState<Aba>('todas');
  const [busca, setBusca] = useState('');

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTrips(await apiRequest<Trip[]>('/trips'));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTrips(); }, [loadTrips]);

  const termo = busca.trim().toLowerCase();
  const visiveis = trips.filter((t) => {
    if (aba === 'hoje' && !isToday(t.plannedDepartureAt)) return false;
    if (aba === 'sem-motorista' && t.driver !== null) return false;
    if (termo) {
      const texto = `${t.id} ${t.vehicle?.plate ?? ''} ${t.driver?.user.name ?? ''} ${t.municipalPickupPoint}`.toLowerCase();
      if (!texto.includes(termo)) return false;
    }
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
      void loadTrips();
    }
  }

  return (
    <AppLayout ativo="Viagens" onNavegar={navegar} onSair={onSair}>
      {criando ? (
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
          {error && <div className="aviso aviso--erro" role="alert">{error}</div>}

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
              value={busca} onChange={(e) => setBusca(e.target.value)} />
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
            <button type="button" className="botao botao--secundario"
              onClick={() => void loadTrips()} disabled={loading} style={{ marginTop: 12 }}>
              Atualizar lista
            </button>
          </section>
        </>
      )}
    </AppLayout>
  );
}
