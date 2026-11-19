import './AppMotorista.css';
import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { apiRequest, apiErrorMessage } from '../../services/api';

interface AppMotoristaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';
type StopDirection = 'OUTBOUND' | 'RETURN';
type StopType = 'MUNICIPAL_PICKUP' | 'APPOINTMENT' | 'MUNICIPAL_RETURN';

interface TripStop {
  id: string;
  direction: StopDirection;
  sequence: number;
  name: string;
  address: string;
  municipality: string;
  stopType: StopType;
  plannedArrivalAt: string | null;
  outboundPatientTrips: { id: string; patient: { name: string } }[];
  returnPatientTrips: { id: string; patient: { name: string } }[];
}

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
  vehicle: { plate: string; capacity: number };
  driver: { id: string; user: { id: string; name: string } };
  _count?: { patientTrips: number };
}

const STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  INTERRUPTED: 'Interrompida',
};

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function errorMessage(error: unknown): string {
  return apiErrorMessage(error);
}

export default function AppMotorista({ onNavegar, onSair }: AppMotoristaProps) {
  const [me, setMe] = useState<Me | null>(null);
  const [tripHoje, setTripHoje] = useState<Trip | null>(null);
  const [proximasViagens, setProximasViagens] = useState<Trip[]>([]);
  const [stopsHoje, setStopsHoje] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const [meData, trips] = await Promise.all([
          apiRequest<Me>('/auth/me'),
          apiRequest<Trip[]>('/trips'),
        ]);
        setMe(meData);

        const minhasViagens = trips.filter(
          (t) => t.driver?.user.id === meData.id,
        );

        const hoje = minhasViagens.find(
          (t) =>
            isToday(t.plannedDepartureAt) &&
            (t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS'),
        ) ?? null;

        const proximas = minhasViagens
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

        setTripHoje(hoje);
        setProximasViagens(proximas);

        if (hoje) {
          const stops = await apiRequest<TripStop[]>(`/trips/${hoje.id}/stops`).catch(() => []);
          setStopsHoje(stops);
        }
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setLoading(false);
      }
    }
    void carregar();
  }, []);

  return (
    <AppLayout ativo="App do motorista" onNavegar={onNavegar} onSair={onSair} larguraTotal>
      <header className="cabecalho">
        <h1>App do motorista</h1>
        <p>Viagens atribuídas ao motorista logado.</p>
      </header>

      {loading ? (
        <p role="status">Carregando…</p>
      ) : error ? (
        <div className="aviso aviso--erro" role="alert">{error}</div>
      ) : (
        <div className="celular">
          <h2 className="celular__titulo">Olá, {me?.name ?? 'Motorista'}</h2>

          {tripHoje ? (
            <>
              <p className="texto-suave">Viagem de hoje</p>
              <section className="cartao" aria-label="Viagem de hoje">
                <strong>
                  {tripHoje.municipalPickupPoint} · {formatTime(tripHoje.plannedDepartureAt)}
                </strong>
                <p className="texto-suave" style={{ margin: '2px 0 10px' }}>
                  {tripHoje.vehicle?.plate ?? '—'} · {tripHoje._count?.patientTrips ?? 0} paciente(s)
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
                <p className="texto-suave" style={{ marginTop: 8 }}>
                  Início do retorno: {formatTime(tripHoje.plannedReturnStartAt)}
                </p>
                {stopsHoje.length > 0 && (
                  <>
                    <h3 className="cartao__subtitulo" style={{ marginTop: 14 }}>Roteiro</h3>
                    {(['OUTBOUND', 'RETURN'] as StopDirection[]).map((dir) => {
                      const lista = stopsHoje
                        .filter((s) => s.direction === dir)
                        .sort((a, b) => a.sequence - b.sequence);
                      if (lista.length === 0) return null;
                      return (
                        <div key={dir} style={{ marginBottom: 10 }}>
                          <p className="texto-suave" style={{ fontWeight: 600, marginBottom: 4 }}>
                            {dir === 'OUTBOUND' ? 'Ida' : 'Retorno'}
                          </p>
                          <ol className="paradas__lista">
                            {lista.map((s) => {
                              const pacientes = dir === 'OUTBOUND'
                                ? s.outboundPatientTrips
                                : s.returnPatientTrips;
                              return (
                                <li key={s.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--ln)', fontSize: 13 }}>
                                  <strong>{s.sequence}. {s.name}</strong>
                                  <br />
                                  <span className="texto-suave">{s.address}</span>
                                  {s.plannedArrivalAt && (
                                    <span className="texto-suave"> · {formatTime(s.plannedArrivalAt)}</span>
                                  )}
                                  {pacientes.length > 0 && (
                                    <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
                                      {pacientes.map((pt) => (
                                        <li key={pt.id} style={{ fontSize: 12 }}>👤 {pt.patient.name}</li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            </>
          ) : (
            <section className="cartao" aria-label="Sem viagem hoje">
              <p className="texto-suave">Nenhuma viagem atribuída para hoje.</p>
            </section>
          )}

          {proximasViagens.length > 0 && (
            <section className="cartao" aria-label="Próximas viagens" style={{ marginTop: 12 }}>
              <h3 className="cartao__subtitulo">Próximas viagens</h3>
              <ul className="lista-hoje">
                {proximasViagens.map((t) => (
                  <li key={t.id}>
                    <time>
                      {new Date(t.plannedDepartureAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}{' '}
                      {formatTime(t.plannedDepartureAt)}
                    </time>
                    <div>
                      <strong>{t.municipalPickupPoint}</strong>
                      <small className="tabela__sub">
                        {t.vehicle?.plate ?? '—'} · {t._count?.patientTrips ?? 0} paciente(s)
                      </small>
                    </div>
                    <span className="status status--info">{STATUS_LABEL[t.status]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!tripHoje && proximasViagens.length === 0 && (
            <p className="texto-suave" style={{ marginTop: 8 }}>
              Nenhuma viagem futura agendada.
            </p>
          )}
        </div>
      )}
    </AppLayout>
  );
}
