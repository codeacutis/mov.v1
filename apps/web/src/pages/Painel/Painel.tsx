import { useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../../services/api';
import './Painel.css';

/* ==================== COMPONENTE DE LAYOUT / MENU ==================== */

interface MenuGrupo {
  titulo: string;
  itens: string[];
}

const GRUPOS: MenuGrupo[] = [
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
          {GRUPOS.map((grupo) => {
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

/* ==================== COMPONENTE PAINEL ==================== */

interface PainelProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'INTERRUPTED';

type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE';

interface Trip {
  id: string;
  plannedDepartureAt: string;
  municipalPickupPoint: string;
  status: TripStatus;
  vehicle: { plate: string } | null;
  driver: { user: { name: string } } | null;
}

interface Vehicle {
  id: string;
  plate: string;
  capacity: number;
  status: VehicleStatus;
}

interface Usuario {
  id: string;
  name: string;
  role: string;
}

const STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  INTERRUPTED: 'Interrompida',
};

type Tom = 'ok' | 'info' | 'alerta';

const STATUS_TOM: Record<TripStatus, Tom> = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'ok',
  COMPLETED: 'ok',
  CANCELLED: 'alerta',
  INTERRUPTED: 'alerta',
};

const VEHICLE_LABEL: Record<VehicleStatus, string> = {
  ACTIVE: 'Disponível',
  IN_MAINTENANCE: 'Em manutenção',
  INACTIVE: 'Inativo',
};

const VEHICLE_TOM: Record<VehicleStatus, Tom> = {
  ACTIVE: 'ok',
  IN_MAINTENANCE: 'alerta',
  INACTIVE: 'alerta',
};

function isToday(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();

  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function saudacao(agora: Date): string {
  const h = agora.getHours();

  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';

  return 'Boa noite';
}

export default function Painel({ onNavegar, onSair }: PainelProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        const [t, v, usuario] = await Promise.all([
          apiRequest<{ data: Trip[] }>('/trips').catch(() => ({
            data: [] as Trip[],
          })),

          apiRequest<{ data: Vehicle[] }>('/vehicles').catch(() => ({
            data: [] as Vehicle[],
          })),

          apiRequest<Usuario>('/auth/me').catch(() => null),
        ]);

        if (!ativo) return;

        setTrips(t.data);
        setVehicles(v.data);

        if (usuario) {
          setNomeUsuario(usuario.name);
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  const agora = new Date();

  const data = agora.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const dataFormatada = data.charAt(0).toUpperCase() + data.slice(1);

  const viagensHoje = trips.filter((t) => isToday(t.plannedDepartureAt));

  const emAndamento = trips.filter((t) => t.status === 'IN_PROGRESS').length;

  const agendadas = trips.filter((t) => t.status === 'SCHEDULED').length;

  const veiculosAtivos = vehicles.filter((v) => v.status === 'ACTIVE').length;

  const semMotorista = trips.filter(
    (t) => t.driver === null && t.status === 'SCHEDULED',
  );

  return (
    <AppLayout ativo="Painel" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>
          {saudacao(agora)}
          {nomeUsuario ? `, ${nomeUsuario}` : ''}
        </h1>

        <p>{dataFormatada} · Setor de Transporte</p>
      </header>

      {loading ? (
        <p role="status">Carregando painel…</p>
      ) : (
        <>
          <section className="indicadores" aria-label="Resumo">
            <div className="cartao indicador">
              <span>Viagens hoje</span>
              <strong>{viagensHoje.length}</strong>
              <small>{emAndamento} em andamento</small>
            </div>

            <div className="cartao indicador">
              <span>Viagens agendadas</span>
              <strong>{agendadas}</strong>
              <small>aguardando execução</small>
            </div>

            <div className="cartao indicador">
              <span>Veículos disponíveis</span>
              <strong>
                {veiculosAtivos} de {vehicles.length}
              </strong>
              <small>
                {vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length}{' '}
                em manutenção
              </small>
            </div>

            <div className="cartao indicador">
              <span>Sem motorista</span>
              <strong>{semMotorista.length}</strong>
              <small>viagens agendadas</small>
            </div>
          </section>

          <div className="duas-colunas">
            <section className="cartao">
              <div className="cartao__cabecalho">
                <h2 className="cartao__titulo">Viagens de hoje</h2>

                <button
                  type="button"
                  className="link"
                  onClick={() => onNavegar('Viagens')}
                >
                  Ver todas
                </button>
              </div>

              {viagensHoje.length === 0 ? (
                <p className="texto-suave">Nenhuma viagem hoje.</p>
              ) : (
                <ul className="lista-hoje">
                  {viagensHoje.map((t) => (
                    <li key={t.id}>
                      <time>{formatTime(t.plannedDepartureAt)}</time>

                      <div>
                        <strong>{t.municipalPickupPoint}</strong>

                        <small className="tabela__sub">
                          {t.vehicle?.plate ?? '—'} ·{' '}
                          {t.driver?.user.name ?? 'Sem motorista'}
                        </small>
                      </div>

                      <span
                        className={`status status--${STATUS_TOM[t.status]}`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="cartao">
              <h2 className="cartao__titulo">Frota agora</h2>

              {vehicles.length === 0 ? (
                <p className="texto-suave">Nenhum veículo cadastrado.</p>
              ) : (
                <ul className="lista-frota">
                  {vehicles.map((v) => (
                    <li key={v.id}>
                      <strong>{v.plate}</strong>

                      <span
                        className={`status status--${VEHICLE_TOM[v.status]}`}
                      >
                        {VEHICLE_LABEL[v.status]}
                      </span>

                      <span className="texto-suave">
                        {v.capacity} lugares
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {semMotorista.length > 0 && (
            <section className="cartao" style={{ marginTop: 16 }}>
              <h2 className="cartao__titulo">Precisa de atenção</h2>

              {semMotorista.map((t) => (
                <div key={t.id} className="aviso aviso--alerta">
                  Viagem de{' '}
                  {new Date(t.plannedDepartureAt).toLocaleDateString('pt-BR')}{' '}
                  está sem motorista.
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </AppLayout>
  );
}