import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AppLayout from '../../components/AppLayout';
import Campo from '../../components/Campo';
import Selecao from '../../components/Selecao';
import { apiRequest, ApiRequestError } from '../../services/api';
import './CadastroVeiculo.css';

interface CadastroVeiculoProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE';
interface Vehicle {
  id: string;
  plate: string;
  description: string | null;
  capacity: number;
  status: VehicleStatus;
}
interface VehicleForm {
  plate: string;
  description: string;
  capacity: string;
  status: VehicleStatus;
}

const STATUS_OPTIONS = [
  { valor: 'ACTIVE', rotulo: 'Disponível' },
  { valor: 'IN_MAINTENANCE', rotulo: 'Em manutenção' },
  { valor: 'INACTIVE', rotulo: 'Inativo' },
];
const STATUS_LABEL: Record<VehicleStatus, string> = {
  ACTIVE: 'Disponível',
  IN_MAINTENANCE: 'Em manutenção',
  INACTIVE: 'Inativo',
};
const EMPTY_FORM: VehicleForm = {
  plate: '',
  description: '',
  capacity: '',
  status: 'ACTIVE',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  if (error instanceof ApiRequestError && error.status === 403) {
    return 'Seu usuário não tem permissão para gerenciar veículos.';
  }
  if (error instanceof TypeError) {
    return 'Não foi possível acessar a API. Confira se o backend está em execução.';
  }
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

export default function CadastroVeiculo({ onNavegar, onSair }: CadastroVeiculoProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setVehicles(await apiRequest<Vehicle[]>('/vehicles'));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNotice('');
    setError('');
    setFormOpen(true);
  }

  function openEditForm(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm({
      plate: vehicle.plate,
      description: vehicle.description ?? '',
      capacity: String(vehicle.capacity),
      status: vehicle.status,
    });
    setNotice('');
    setError('');
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      plate: form.plate.trim().toUpperCase(),
      description: form.description.trim() || null,
      capacity: Number(form.capacity),
      status: form.status,
    };
    try {
      if (editingId) {
        await apiRequest<Vehicle>(`/vehicles/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setNotice('Veículo atualizado.');
      } else {
        await apiRequest<Vehicle>('/vehicles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice('Veículo cadastrado.');
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadVehicles();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function inactivate(vehicle: Vehicle) {
    if (!window.confirm(`Inativar o veículo ${vehicle.plate}?`)) return;
    setError('');
    setNotice('');
    try {
      await apiRequest<Vehicle>(`/vehicles/${vehicle.id}/inactivate`, {
        method: 'PATCH',
      });
      setNotice(`Veículo ${vehicle.plate} inativado.`);
      await loadVehicles();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AppLayout ativo="Veículos" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Veículos</h1>
          <p>Cadastre e mantenha a frota municipal.</p>
        </div>
        {!formOpen && (
          <button className="botao botao--primario veiculos__novo" onClick={openCreateForm}>
            Novo veículo
          </button>
        )}
      </header>

      {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
      {error && <div className="aviso aviso--erro" role="alert">{error}</div>}

      {formOpen ? (
        <form className="cartao veiculos__form" onSubmit={saveVehicle}>
          <h2 className="cartao__titulo">{editingId ? 'Editar veículo' : 'Cadastrar veículo'}</h2>
          <div className="grade">
            <Campo
              id="vehicle-plate"
              rotulo="Placa"
              placeholder="ABC1D23"
              maxLength={7}
              pattern="[A-Za-z0-9]{7}"
              autoCapitalize="characters"
              value={form.plate}
              onChange={(event) => setForm({ ...form, plate: event.target.value.toUpperCase() })}
              required
            />
            <Campo
              id="vehicle-description"
              rotulo="Descrição ou modelo"
              placeholder="Van de passageiros"
              maxLength={160}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <Campo
              id="vehicle-capacity"
              rotulo="Capacidade de passageiros"
              type="number"
              min={1}
              step={1}
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: event.target.value })}
              required
            />
            <Selecao
              id="vehicle-status"
              rotulo="Situação"
              opcoes={STATUS_OPTIONS}
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as VehicleStatus })}
            />
          </div>
          <p className="texto-suave">A capacidade considera passageiros e acompanhantes; o motorista não é contado.</p>
          <div className="acoes">
            <button type="button" className="botao botao--secundario" onClick={cancelForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar veículo'}
            </button>
          </div>
        </form>
      ) : (
        <section className="cartao veiculos__lista" aria-labelledby="veiculos-titulo">
          <h2 id="veiculos-titulo" className="cartao__titulo">Frota cadastrada</h2>
          {loading ? (
            <p role="status">Carregando veículos…</p>
          ) : vehicles.length === 0 ? (
            <p className="texto-suave">Nenhum veículo cadastrado.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr><th>Placa</th><th>Descrição</th><th>Capacidade</th><th>Situação</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td><strong>{vehicle.plate}</strong></td>
                      <td>{vehicle.description || '—'}</td>
                      <td>{vehicle.capacity}</td>
                      <td>
                        <span className={`status ${vehicle.status === 'ACTIVE' ? 'status--ok' : vehicle.status === 'INACTIVE' ? 'status--erro' : 'status--alerta'}`}>
                          {STATUS_LABEL[vehicle.status]}
                        </span>
                      </td>
                      <td className="veiculos__acoes">
                        <button className="link" type="button" onClick={() => openEditForm(vehicle)}>Editar</button>
                        {vehicle.status !== 'INACTIVE' && (
                          <button className="link veiculos__inativar" type="button" onClick={() => void inactivate(vehicle)}>
                            Inativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="botao botao--secundario veiculos__atualizar" onClick={() => void loadVehicles()} disabled={loading}>
            Atualizar lista
          </button>
        </section>
      )}
    </AppLayout>
  );
}