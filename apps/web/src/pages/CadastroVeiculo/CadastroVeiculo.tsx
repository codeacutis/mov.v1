import { useState, type FormEvent } from 'react';
import AppLayout from '../../components/AppLayout';
import Campo from '../../components/Campo';
import Selecao from '../../components/Selecao';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';
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
  return apiErrorMessage(error);
}

export default function CadastroVeiculo({ onNavegar, onSair }: CadastroVeiculoProps) {
  const { data: vehicles, loading, error: listError, page, totalPages, q, search, goTo, reload } =
    usePaginatedList<Vehicle>('/vehicles');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
      reload();
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
      reload();
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
      {(error || listError) && <div className="aviso aviso--erro" role="alert">{error || listError}</div>}

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
          <div className="filtros">
            <input type="search" className="filtro" placeholder="Buscar por placa ou descrição"
              aria-label="Buscar veículos" value={q} onChange={(e) => search(e.target.value)} />
          </div>
          {loading ? (
            <p role="status">Carregando veículos…</p>
          ) : vehicles.length === 0 ? (
            <p className="texto-suave">Nenhum veículo encontrado.</p>
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
          <Paginacao page={page} totalPages={totalPages} onGoTo={goTo} />
          <button type="button" className="botao botao--secundario veiculos__atualizar" onClick={reload} disabled={loading}>
            Atualizar lista
          </button>
        </section>
      )}
    </AppLayout>
  );
}