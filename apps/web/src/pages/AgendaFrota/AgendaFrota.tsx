import './AgendaFrota.css';
import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import Selecao from '../../components/Selecao';
import { apiRequest } from '../../services/api';

interface AgendaFrotaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';
type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE';

interface Trip {
  id: string;
  plannedDepartureAt: string;
  plannedReturnStartAt: string;
  municipalPickupPoint: string;
  status: TripStatus;
  vehicle: { id: string; plate: string } | null;
  driver: { user: { name: string } } | null;
  _count?: { patientTrips: number };
}

interface Vehicle {
  id: string;
  plate: string;
  status: VehicleStatus;
}

type Situacao = TripStatus | 'IN_MAINTENANCE';

const ROTULOS: Record<Situacao, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  INTERRUPTED: 'Interrompida',
  IN_MAINTENANCE: 'Em manutenção',
};

const STATUS_CSS: Record<Situacao, string> = {
  SCHEDULED: 'agendada',
  IN_PROGRESS: 'andamento',
  COMPLETED: 'concluida',
  CANCELLED: 'concluida',
  INTERRUPTED: 'concluida',
  IN_MAINTENANCE: 'manutencao',
};

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function segundaDaSemana(ref: Date, delta: number): Date {
  const diff = (ref.getDay() + 6) % 7;
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - diff + delta * 7);
}

function somarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function tituloSemana(inicio: Date): string {
  const fim = somarDias(inicio, 5);
  const mes = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' });
  return inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()} a ${fim.getDate()} de ${mes(fim)} de ${fim.getFullYear()}`
    : `${inicio.getDate()} de ${mes(inicio)} a ${fim.getDate()} de ${mes(fim)} de ${fim.getFullYear()}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AgendaFrota({ onNavegar, onSair }: AgendaFrotaProps) {
  const [semana, setSemana] = useState(0);
  const [filtroVeiculo, setFiltroVeiculo] = useState('Todos');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<Trip[]>('/trips').catch(() => [] as Trip[]),
      apiRequest<Vehicle[]>('/vehicles').catch(() => [] as Vehicle[]),
    ]).then(([t, v]) => {
      setTrips(t);
      setVehicles(v);
      setLoading(false);
    });
  }, []);

  const hoje = new Date();
  const inicio = segundaDaSemana(hoje, semana);
  const datas = DIAS.map((_, i) => somarDias(inicio, i));

  const veiculosFiltrados = filtroVeiculo === 'Todos'
    ? vehicles
    : vehicles.filter((v) => v.id === filtroVeiculo);

  function tripsNoCelula(vehicleId: string, dia: Date): Trip[] {
    return trips.filter((t) => {
      if (!t.vehicle || t.vehicle.id !== vehicleId) return false;
      if (t.status === 'CANCELLED') return false;
      return mesmoDia(new Date(t.plannedDepartureAt), dia);
    });
  }

  const tripSelecionada = trips.find((t) => t.id === selecionado);

  function mudarSemana(nova: number) {
    setSemana(nova);
    setSelecionado(null);
  }

  const vehicleOptions = [
    'Todos',
    ...vehicles.map((v) => ({ valor: v.id, rotulo: v.plate })),
  ];

  return (
    <AppLayout ativo="Agenda da frota" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>Agenda da frota</h1>
        <p>Veja a ocupação dos veículos e evite conflitos de horário.</p>
      </header>

      <div className="filtros filtros--agenda">
        <div className="navegacao-semana">
          <button type="button" className="botao botao--secundario" onClick={() => mudarSemana(semana - 1)}>
            ‹ Anterior
          </button>
          <button type="button" className="botao botao--secundario" onClick={() => mudarSemana(0)} disabled={semana === 0}>
            Hoje
          </button>
          <button type="button" className="botao botao--secundario" onClick={() => mudarSemana(semana + 1)}>
            Próxima ›
          </button>
          <strong className="navegacao-semana__titulo" aria-live="polite">{tituloSemana(inicio)}</strong>
        </div>
        <Selecao
          id="filtro-veiculo"
          rotulo="Veículo"
          opcoes={vehicleOptions}
          value={filtroVeiculo}
          onChange={(e) => setFiltroVeiculo(e.target.value)}
        />
      </div>

      {loading ? (
        <p role="status">Carregando agenda…</p>
      ) : (
        <section className="cartao">
          <div className="tabela-rolagem">
            <table className="agenda">
              <thead>
                <tr>
                  <th scope="col" className="agenda__canto">Veículo</th>
                  {datas.map((d, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={mesmoDia(d, hoje) ? 'agenda__dia agenda__dia--hoje' : 'agenda__dia'}
                    >
                      {DIAS[i]} {String(d.getDate()).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {veiculosFiltrados.map((v) => (
                  <tr key={v.id}>
                    <th scope="row" className="agenda__veiculo">
                      {v.plate}
                      {v.status === 'IN_MAINTENANCE' && <small>Manutenção</small>}
                    </th>
                    {datas.map((d, i) => {
                      const celTrips = tripsNoCelula(v.id, d);
                      const emManutencao = v.status === 'IN_MAINTENANCE';
                      return (
                        <td
                          key={i}
                          className={mesmoDia(d, hoje) ? 'agenda__celula agenda__celula--hoje' : 'agenda__celula'}
                        >
                          {emManutencao && celTrips.length === 0 && (
                            <span className="evento evento--manutencao">Manutenção</span>
                          )}
                          {celTrips.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`evento evento--${STATUS_CSS[t.status]}${t.id === selecionado ? ' evento--ativo' : ''}`}
                              aria-pressed={t.id === selecionado}
                              onClick={() => setSelecionado(t.id === selecionado ? null : t.id)}
                            >
                              <b>{formatTime(t.plannedDepartureAt)}</b> {t.municipalPickupPoint}
                            </button>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {veiculosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="texto-suave" style={{ padding: 16 }}>
                      Nenhum veículo cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="legenda" aria-label="Legenda">
            {(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'IN_MAINTENANCE'] as Situacao[]).map((s) => (
              <li key={s}>
                <span className={`legenda__cor evento--${STATUS_CSS[s]}`} aria-hidden="true" />
                {ROTULOS[s]}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cartao" style={{ marginTop: 16 }} aria-live="polite">
        {tripSelecionada ? (
          <>
            <h2 className="cartao__titulo">
              {tripSelecionada.municipalPickupPoint} · {tripSelecionada.vehicle?.plate ?? '—'}
            </h2>
            <dl className="detalhes">
              <div><dt>Situação</dt><dd>{ROTULOS[tripSelecionada.status]}</dd></div>
              <div><dt>Saída</dt><dd>{formatTime(tripSelecionada.plannedDepartureAt)}</dd></div>
              <div><dt>Início do retorno</dt><dd>{formatTime(tripSelecionada.plannedReturnStartAt)}</dd></div>
              <div><dt>Motorista</dt><dd>{tripSelecionada.driver?.user.name ?? '—'}</dd></div>
              {tripSelecionada._count && (
                <div><dt>Pacientes</dt><dd>{tripSelecionada._count.patientTrips}</dd></div>
              )}
            </dl>
          </>
        ) : (
          <p className="texto-suave" style={{ margin: 0 }}>
            Clique em uma viagem da agenda para ver os detalhes.
          </p>
        )}
      </section>
    </AppLayout>
  );
}
