import './AppMotorista.css';
import { useEffect, useState, type ReactNode } from 'react';
import { apiRequest, apiErrorMessage } from '../../services/api';

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

/* ==================== COMPONENTE APP DO MOTORISTA ==================== */

interface AppMotoristaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'INTERRUPTED';

type StopDirection = 'OUTBOUND' | 'RETURN';

interface Me {
  id: string;
  name: string;
  role: string;
}

interface Trip {
  id: string;
  plannedDepartureAt: string;
  plannedReturnStartAt: string;
  municipalPickupPoint: string;
  status: TripStatus;
  vehicle: {
    plate: string;
    description?: string;
    capacity: number;
  };
  _count?: {
    patientTrips: number;
  };
}

interface TripStop {
  id: string;
  direction: StopDirection;
  sequence: number;
  name: string;
  address: string;
  municipality: string;
  stopType: string;
  plannedArrivalAt: string | null;
}

interface PatientTrip {
  id: string;
  outboundStopId: string | null;
  returnStopId: string | null;
  patient: {
    name: string;
    phone?: string | null;
    usesWheelchair?: boolean;
    hasReducedMobility?: boolean;
    needsBoardingAssistance?: boolean;
  };
}

interface TripDetail extends Trip {
  stops: TripStop[];
  patientTrips: PatientTrip[];
}

const STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  INTERRUPTED: 'Interrompida',
};

function isToday(iso: string): boolean {
  const data = new Date(iso);
  const hoje = new Date();

  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export default function AppMotorista({
  onNavegar,
  onSair,
}: AppMotoristaProps) {
  const [me, setMe] = useState<Me | null>(null);
  const [tripHoje, setTripHoje] = useState<TripDetail | null>(null);
  const [proximasViagens, setProximasViagens] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setLoading(true);
        setError('');

        const [meData, viagens] = await Promise.all([
          apiRequest<Me>('/auth/me'),
          apiRequest<Trip[]>('/driver/trips'),
        ]);

        if (!ativo) return;

        setMe(meData);

        const hoje = viagens.find(
          (t) =>
            isToday(t.plannedDepartureAt) &&
            (t.status === 'SCHEDULED' ||
              t.status === 'IN_PROGRESS'),
        ) ?? null;

        const proximas = viagens
          .filter(
            (t) =>
              !isToday(t.plannedDepartureAt) &&
              t.status === 'SCHEDULED' &&
              new Date(t.plannedDepartureAt) > new Date(),
          )
          .sort(
            (a, b) =>
              new Date(a.plannedDepartureAt).getTime() -
              new Date(b.plannedDepartureAt).getTime(),
          )
          .slice(0, 5);

        setProximasViagens(proximas);

        if (hoje) {
          const detalhes = await apiRequest<TripDetail>(
            `/driver/trips/${hoje.id}`,
          );

          if (!ativo) return;

          setTripHoje(detalhes);
        } else {
          setTripHoje(null);
        }
      } catch (cause) {
        if (ativo) {
          setError(apiErrorMessage(cause));
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <AppLayout
      ativo="App do motorista"
      onNavegar={onNavegar}
      onSair={onSair}
      larguraTotal
    >
      <header className="cabecalho">
        <h1>App do motorista</h1>
        <p>Viagens atribuídas ao motorista logado.</p>
      </header>

      {loading ? (
        <p role="status">Carregando viagens...</p>
      ) : error ? (
        <div className="aviso aviso--erro" role="alert">
          {error}
        </div>
      ) : (
        <div className="celular">
          <h2 className="celular__titulo">
            Olá, {me?.name ?? 'Motorista'}
          </h2>

          {tripHoje ? (
            <section
              className="cartao"
              aria-label="Viagem de hoje"
            >
              <p className="texto-suave">Viagem de hoje</p>

              <strong>
                {tripHoje.municipalPickupPoint} ·{' '}
                {formatTime(tripHoje.plannedDepartureAt)}
              </strong>

              <p
                className="texto-suave"
                style={{ margin: '8px 0 10px' }}
              >
                {tripHoje.vehicle?.plate ?? '—'} ·{' '}
                {tripHoje._count?.patientTrips ?? 0} paciente(s)
              </p>

              <span
                className={
                  tripHoje.status === 'IN_PROGRESS'
                    ? 'status status--ok'
                    : 'status status--info'
                }
              >
                {STATUS_LABEL[tripHoje.status]}
              </span>

              <p
                className="texto-suave"
                style={{ marginTop: 8 }}
              >
                Início do retorno:{' '}
                {formatTime(tripHoje.plannedReturnStartAt)}
              </p>

              {tripHoje.stops.length > 0 && (
                <>
                  <h3
                    className="cartao__subtitulo"
                    style={{ marginTop: 14 }}
                  >
                    Roteiro
                  </h3>

                  {(['OUTBOUND', 'RETURN'] as StopDirection[]).map(
                    (direcao) => {
                      const paradas = tripHoje.stops
                        .filter((s) => s.direction === direcao)
                        .sort((a, b) =>
                          direcao === 'RETURN'
                            ? b.sequence - a.sequence
                            : a.sequence - b.sequence,
                        );

                      if (paradas.length === 0) return null;

                      return (
                        <div
                          key={direcao}
                          style={{ marginBottom: 10 }}
                        >
                          <p
                            className="texto-suave"
                            style={{
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            {direcao === 'OUTBOUND'
                              ? 'Ida'
                              : 'Retorno'}
                          </p>

                          <ol className="paradas__lista">
                            {paradas.map((parada) => {
                              const pacientes =
                                tripHoje.patientTrips.filter((pt) =>
                                  direcao === 'OUTBOUND'
                                    ? pt.outboundStopId === parada.id
                                    : pt.returnStopId === parada.id,
                                );

                              return (
                                <li
                                  key={parada.id}
                                  style={{
                                    padding: '6px 0',
                                    borderBottom:
                                      '1px solid var(--ln)',
                                    fontSize: 13,
                                  }}
                                >
                                  <strong>
                                    {parada.sequence}. {parada.name}
                                  </strong>

                                  <br />

                                  <span className="texto-suave">
                                    {parada.address}
                                  </span>

                                  {parada.plannedArrivalAt && (
                                    <span className="texto-suave">
                                      {' '}·{' '}
                                      {formatTime(
                                        parada.plannedArrivalAt,
                                      )}
                                    </span>
                                  )}

                                  {pacientes.length > 0 && (
                                    <ul
                                      style={{
                                        margin: '4px 0 0',
                                        padding: 0,
                                        listStyle: 'none',
                                      }}
                                    >
                                      {pacientes.map((pt) => (
                                        <li
                                          key={pt.id}
                                          style={{ fontSize: 12 }}
                                        >
                                          👤 {pt.patient.name}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      );
                    },
                  )}
                </>
              )}
            </section>
          ) : (
            <section
              className="cartao"
              aria-label="Sem viagem hoje"
            >
              <p className="texto-suave">
                Nenhuma viagem atribuída para hoje.
              </p>
            </section>
          )}

          {proximasViagens.length > 0 && (
            <section
              className="cartao"
              aria-label="Próximas viagens"
              style={{ marginTop: 12 }}
            >
              <h3 className="cartao__subtitulo">
                Próximas viagens
              </h3>

              <ul className="lista-hoje">
                {proximasViagens.map((t) => (
                  <li key={t.id}>
                    <time>
                      {formatDate(t.plannedDepartureAt)}{' '}
                      {formatTime(t.plannedDepartureAt)}
                    </time>

                    <div>
                      <strong>{t.municipalPickupPoint}</strong>

                      <small className="tabela__sub">
                        {t.vehicle?.plate ?? '—'} ·{' '}
                        {t._count?.patientTrips ?? 0} paciente(s)
                      </small>
                    </div>

                    <span className="status status--info">
                      {STATUS_LABEL[t.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!tripHoje && proximasViagens.length === 0 && (
            <p
              className="texto-suave"
              style={{ marginTop: 8 }}
            >
              Nenhuma viagem futura agendada.
            </p>
          )}
        </div>
      )}
    </AppLayout>
  );
}