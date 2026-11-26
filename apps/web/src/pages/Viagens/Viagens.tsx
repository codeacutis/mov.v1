import './Viagens.css';
import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import FormularioViagem from '../../components/FormularioViagem';
import GerenciarParadas from '../GerenciarParadas/GerenciarParadas';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface ViagensProps {
  iniciarCriando?: boolean;
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';


interface Trip {
  id: string;
  plannedDepartureAt: string;
  plannedReturnStartAt: string;
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
  const [editing, setEditing] = useState<Trip | undefined>();
  const [operation, setOperation] = useState<{ trip: Trip; kind: 'cancel' | 'interrupt' } | null>(null);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submitOperation(event: React.FormEvent) {
    event.preventDefault();
    if (!operation) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(`/trips/${operation.trip.id}/${operation.kind}`, { method: 'PATCH', body: JSON.stringify({ reason: reason.trim(), ...(operation.kind === 'interrupt' ? { action: action.trim() } : {}) }) });
      setNotice(operation.kind === 'cancel' ? 'Viagem cancelada.' : 'Viagem interrompida.');
      setOperation(null); reload();
    } catch (cause) { setError(apiErrorMessage(cause)); }
    finally { setSaving(false); }
  }


  const visiveis = trips;

  function navegar(item: string) {
    if (item === 'Viagens') { setCriando(false); setNotice(''); }
    onNavegar(item);
  }

  function aoConcluirFormulario(salvou: boolean) {
    setCriando(false);
    setEditing(undefined);
    if (salvou) {
      setNotice(editing ? 'Viagem atualizada.' : 'Viagem cadastrada com sucesso.');
      reload();
    }
  }

  return (
    <AppLayout ativo="Viagens" onNavegar={navegar} onSair={onSair}>
      {paradaTrip ? (
        <GerenciarParadas tripId={paradaTrip} onVoltar={() => setParadaTrip(null)} />
      ) : criando || editing ? (
        <FormularioViagem key={editing?.id ?? "new"} trip={editing} onConcluir={aoConcluirFormulario} />
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
          {operation && <form className="cartao" onSubmit={submitOperation}>
            <h2>{operation.kind === "cancel" ? "Cancelar viagem" : "Interromper viagem"}</h2>
            <label>Motivo<input value={reason} onChange={e => setReason(e.target.value)} required maxLength={500} /></label>
            {operation.kind === "interrupt" && <label>Provid?ncias<input value={action} onChange={e => setAction(e.target.value)} required maxLength={500} /></label>}
            <button type="submit" disabled={saving || !reason.trim() || (operation.kind === "interrupt" && !action.trim())}>{saving ? "Salvando?" : "Confirmar"}</button>
            <button type="button" disabled={saving} onClick={() => setOperation(null)}>Voltar</button>
          </form>}
          {listError && <div className="aviso aviso--erro" role="alert">{listError}</div>}

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
                          {t.status === 'SCHEDULED' && <>
                            <button className="link" type="button" onClick={() => { setError(''); setEditing(t); }}>Editar</button>
                            <button className="link" type="button" disabled={saving} onClick={() => { setReason(''); setAction(''); setError(''); setOperation({ trip: t, kind: 'cancel' }); }}>Cancelar</button>
                          </>}
                          {t.status === 'IN_PROGRESS' && <button className="link" type="button" disabled={saving} onClick={() => { setReason(''); setAction(''); setError(''); setOperation({ trip: t, kind: 'interrupt' }); }}>Interromper</button>}
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
