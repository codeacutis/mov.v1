import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { apiRequest } from '../../services/api';
import './Painel.css';

interface PainelProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';
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
  return d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dataFormatada = data.charAt(0).toUpperCase() + data.slice(1);

  const viagensHoje = trips.filter((t) => isToday(t.plannedDepartureAt));
  const emAndamento = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const agendadas = trips.filter((t) => t.status === 'SCHEDULED').length;
  const veiculosAtivos = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const semMotorista = trips.filter((t) => t.driver === null && t.status === 'SCHEDULED');

  return (
    <AppLayout ativo="Painel" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>{saudacao(agora)}</h1>
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
              <strong>{veiculosAtivos} de {vehicles.length}</strong>
              <small>{vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length} em manutenção</small>
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
                <button type="button" className="link" onClick={() => onNavegar('Viagens')}>
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
                          {t.vehicle?.plate ?? '—'} · {t.driver?.user.name ?? 'Sem motorista'}
                        </small>
                      </div>
                      <span className={`status status--${STATUS_TOM[t.status]}`}>
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
                      <span className={`status status--${VEHICLE_TOM[v.status]}`}>
                        {VEHICLE_LABEL[v.status]}
                      </span>
                      <span className="texto-suave">{v.capacity} lugares</span>
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
                  Viagem de {new Date(t.plannedDepartureAt).toLocaleDateString('pt-BR')} está sem motorista.
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </AppLayout>
  );
}
