import './Relatorios.css';
import { useEffect, useState, type ReactNode } from 'react';
import Selecao from '../../components/Selecao';
import { apiRequest } from '../../services/api';

/* ==================== COMPONENTE DE LAYOUT / MENU ==================== */

interface MenuGrupo {
  titulo: string;
  itens: string[];
}

const MENU_GRUPOS: MenuGrupo[] = [
  {
    titulo: 'Operação',
    itens: ['Painel', 'Viagens', 'Agenda da frota'],
  },
  {
    titulo: 'Cadastros',
    itens: ['Veículos', 'Motoristas', 'Passageiros'],
  },
  {
    titulo: 'Gestão',
    itens: ['Relatórios', 'App do motorista'],
  },
  {
    titulo: 'Conta',
    itens: ['Sair'],
  },
];

interface AppLayoutProps {
  ativo: string;
  onNavegar: (item: string) => void;
  onSair: () => void;
  larguraTotal?: boolean;
  children: ReactNode;
}

function AppLayout({
  ativo,
  onNavegar,
  onSair,
  larguraTotal = false,
  children,
}: AppLayoutProps) {
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);

  function toggleGrupo(titulo: string) {
    setGrupoAberto((atual) => (atual === titulo ? null : titulo));
  }

  function handleItemClick(item: string) {
    if (item === 'Sair') {
      onSair();
      return;
    }
    onNavegar(item);
  }

  return (
    <div className="app">
      <aside className="menu">
        <div className="logo">
          <span className="logo__icone">+</span>
          Mov+
        </div>

        <nav aria-label="Principal">
          {MENU_GRUPOS.map((grupo) => {
            const estaAberto = grupoAberto === grupo.titulo;

            return (
              <div
                key={grupo.titulo}
                role="group"
                aria-label={grupo.titulo}
                className={
                  estaAberto
                    ? 'menu__grupo menu__grupo--aberto'
                    : 'menu__grupo'
                }
              >
                <button
                  type="button"
                  className="menu__titulo"
                  aria-expanded={estaAberto}
                  onClick={() => toggleGrupo(grupo.titulo)}
                >
                  <span>{grupo.titulo}</span>
                  <span className="menu__seta" aria-hidden="true">
                    ▾
                  </span>
                </button>

                <div className="menu__subitens">
                  {grupo.itens.map((item) => {
                    const isAtivo = item !== 'Sair' && item === ativo;

                    return (
                      <button
                        key={item}
                        type="button"
                        className={
                          isAtivo
                            ? 'menu__item menu__item--ativo'
                            : 'menu__item'
                        }
                        aria-current={isAtivo ? 'page' : undefined}
                        onClick={() => handleItemClick(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main
        className={
          larguraTotal
            ? 'app__conteudo app__conteudo--total'
            : 'app__conteudo'
        }
      >
        {children}
      </main>
    </div>
  );
}

/* ==================== COMPONENTE RELATÓRIOS ==================== */

interface RelatoriosProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';

interface Trip {
  id: string;
  plannedDepartureAt: string;
  municipalPickupPoint: string;
  status: TripStatus;
  vehicle: { id: string; plate: string; capacity: number } | null;
  driver: { user: { name: string } } | null;
  _count?: { patientTrips: number };
}

interface Vehicle {
  id: string;
  plate: string;
  capacity: number;
  status: 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE';
}

interface Contagem {
  nome: string;
  total: number;
}

interface UsoVeiculo {
  plate: string;
  viagens: number;
  pacientes: number;
}

function getMesAno(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function getUltimosMeses(n: number): { label: string; inicio: Date; fim: Date }[] {
  const result = [];
  const agora = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = getMesAno(d);
    result.push({ label, inicio, fim });
  }
  return result;
}

function Barras({ dados }: { dados: Contagem[] }) {
  const maior = Math.max(...dados.map((d) => d.total), 1);
  return (
    <ul className="barras">
      {dados.map((d) => (
        <li key={d.nome}>
          <div className="barras__texto">
            <span>{d.nome}</span>
            <strong>{d.total}</strong>
          </div>
          <div className="medidor">
            <i style={{ width: `${(d.total / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Relatorios({ onNavegar, onSair }: RelatoriosProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroVeiculo, setFiltroVeiculo] = useState('Todos');

  const periodos = getUltimosMeses(3);
  const [filtroPeriodo, setFiltroPeriodo] = useState(periodos[0].label);

  useEffect(() => {
    Promise.all([
      apiRequest<{ data: Trip[] }>('/trips').catch(() => ({ data: [] as Trip[] })),
      apiRequest<{ data: Vehicle[] }>('/vehicles').catch(() => ({ data: [] as Vehicle[] })),
    ]).then(([t, v]) => {
      setTrips(t.data);
      setVehicles(v.data);
      setLoading(false);
    });
  }, []);

  const periodoSelecionado = periodos.find((p) => p.label === filtroPeriodo) ?? periodos[0];

  const tripsDoPeriodo = trips.filter((t) => {
    const d = new Date(t.plannedDepartureAt);
    return d >= periodoSelecionado.inicio && d <= periodoSelecionado.fim;
  });

  const realizadas = tripsDoPeriodo.filter((t) => t.status === 'COMPLETED').length;
  const canceladas = tripsDoPeriodo.filter((t) => t.status === 'CANCELLED').length;
  const totalPacientes = tripsDoPeriodo.reduce((acc, t) => acc + (t._count?.patientTrips ?? 0), 0);

  const porDestino: Contagem[] = Object.entries(
    tripsDoPeriodo.reduce<Record<string, number>>((acc, t) => {
      const dest = t.municipalPickupPoint;
      acc[dest] = (acc[dest] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const usoVeiculos: UsoVeiculo[] = vehicles
    .filter((v) => filtroVeiculo === 'Todos' || v.id === filtroVeiculo)
    .map((v) => {
      const vTrips = tripsDoPeriodo.filter((t) => t.vehicle?.id === v.id);
      return {
        plate: v.plate,
        viagens: vTrips.length,
        pacientes: vTrips.reduce((acc, t) => acc + (t._count?.patientTrips ?? 0), 0),
      };
    })
    .sort((a, b) => b.viagens - a.viagens);

  const vehicleOptions = [
    'Todos',
    ...vehicles.map((v) => ({ valor: v.id, rotulo: v.plate })),
  ];

  return (
    <AppLayout ativo="Relatórios" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Relatórios</h1>
          <p>Indicadores de uso da frota e do transporte de pacientes.</p>
        </div>
      </header>

      <div className="filtros">
        <Selecao
          id="periodo"
          rotulo="Período"
          opcoes={periodos.map((p) => p.label)}
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
        />
        <Selecao
          id="filtro-veiculo"
          rotulo="Veículo"
          opcoes={vehicleOptions}
          value={filtroVeiculo}
          onChange={(e) => setFiltroVeiculo(e.target.value)}
        />
      </div>

      {loading ? (
        <p role="status">Carregando relatórios…</p>
      ) : (
        <>
          <section className="indicadores" aria-label={`Resumo de ${filtroPeriodo}`}>
            <div className="cartao indicador">
              <span>Viagens realizadas</span>
              <strong>{realizadas}</strong>
              <small>{canceladas} canceladas</small>
            </div>
            <div className="cartao indicador">
              <span>Pacientes transportados</span>
              <strong>{totalPacientes}</strong>
              <small>no período</small>
            </div>
            <div className="cartao indicador">
              <span>Total de viagens</span>
              <strong>{tripsDoPeriodo.length}</strong>
              <small>incluindo agendadas</small>
            </div>
            <div className="cartao indicador">
              <span>Veículos ativos</span>
              <strong>{vehicles.filter((v) => v.status === 'ACTIVE').length}</strong>
              <small>de {vehicles.length} cadastrados</small>
            </div>
          </section>

          <div className="duas-colunas duas-colunas--iguais">
            <section className="cartao">
              <h2 className="cartao__titulo">Viagens por destino</h2>
              {porDestino.length === 0 ? (
                <p className="texto-suave">Sem dados no período.</p>
              ) : (
                <Barras dados={porDestino} />
              )}
            </section>

            <section className="cartao">
              <h2 className="cartao__titulo">Uso por veículo</h2>
              {usoVeiculos.length === 0 ? (
                <p className="texto-suave">Nenhum veículo cadastrado.</p>
              ) : (
                <div className="tabela-rolagem">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Veículo</th>
                        <th>Viagens</th>
                        <th>Pacientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usoVeiculos.map((v) => (
                        <tr key={v.plate}>
                          <td><strong>{v.plate}</strong></td>
                          <td>{v.viagens}</td>
                          <td>{v.pacientes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </AppLayout>
  );
}