import { useEffect, useState, type FormEvent } from 'react';
import AppLayout from '../../components/AppLayout';
import Campo from '../../components/Campo';
import Selecao from '../../components/Selecao';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface CadastroMotoristaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface Driver {
  id: string;
  licenseNumber: string | null;
  licenseCategory: string | null;
  licenseExpiresAt: string | null;
  hasPassengerTransportCourse: boolean;
  notes: string | null;
  isActive: boolean;
  user: { id: string; name: string; email: string; role: string; isActive: boolean };
}

interface DriverForm {
  name: string;
  email: string;
  password: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiresAt: string;
  hasPassengerTransportCourse: boolean;
  notes: string;
}

const CATEGORIAS = [
  { valor: 'B', rotulo: 'B' },
  { valor: 'C', rotulo: 'C' },
  { valor: 'D', rotulo: 'D' },
  { valor: 'E', rotulo: 'E' },
];

const EMPTY_FORM: DriverForm = {
  name: '',
  email: '',
  password: '',
  licenseNumber: '',
  licenseCategory: 'D',
  licenseExpiresAt: '',
  hasPassengerTransportCourse: false,
  notes: '',
};

function errorMessage(error: unknown): string {
  return apiErrorMessage(error);
}

export default function CadastroMotorista({ onNavegar, onSair }: CadastroMotoristaProps) {
  const { data: drivers, loading, error: listError, page, totalPages, q, search, goTo, reload } =
    usePaginatedList<Driver>('/drivers');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [integrity, setIntegrity] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ usersWithoutDriver: { id: string }[]; inconsistentDrivers: { id: string }[] }>('/drivers/inconsistencies', { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted && (result.usersWithoutDriver.length || result.inconsistentDrivers.length)) setIntegrity(`Revis?o necess?ria: ${result.usersWithoutDriver.length} contas sem motorista e ${result.inconsistentDrivers.length} v?nculos inconsistentes. Solicite a revis?o dos v?nculos ao respons?vel pelo sistema. Nenhum registro foi removido.`); })
      .catch(cause => { if (!controller.signal.aborted) setIntegrity(`N?o foi poss?vel verificar os v?nculos: ${apiErrorMessage(cause)}`); });
    return () => controller.abort();
  }, []);

  function openEdit(d: Driver) {
    setEditingId(d.id);
    setForm({ name: d.user.name, email: d.user.email, password: '', licenseNumber: d.licenseNumber ?? '', licenseCategory: d.licenseCategory ?? '', licenseExpiresAt: d.licenseExpiresAt?.slice(0, 10) ?? '', hasPassengerTransportCourse: d.hasPassengerTransportCourse, notes: d.notes ?? '' });
    setError(''); setNotice(''); setFormOpen(true);
  }

  function openForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function saveDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password || undefined,
      licenseNumber: form.licenseNumber.trim() || '',
      licenseCategory: form.licenseCategory || '',
      licenseExpiresAt: form.licenseExpiresAt || '',
      hasPassengerTransportCourse: form.hasPassengerTransportCourse,
      notes: form.notes.trim() || '',
    };
    try {
      await apiRequest<Driver>(editingId ? `/drivers/${editingId}` : '/drivers', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setNotice(editingId ? 'Motorista atualizado.' : 'Motorista cadastrado.');
      setFormOpen(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function inactivate(driver: Driver) {
    if (!window.confirm(`Inativar o motorista ${driver.user.name}?`)) return;
    setError('');
    setNotice('');
    try {
      await apiRequest<Driver>(`/drivers/${driver.id}/inactivate`, { method: 'PATCH' });
      setNotice(`Motorista ${driver.user.name} inativado.`);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AppLayout ativo="Motoristas" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Motoristas</h1>
          <p>Cadastre e mantenha os motoristas municipais.</p>
        </div>
        {!formOpen && (
          <button className="botao botao--primario" onClick={openForm}>
            Novo motorista
          </button>
        )}
      </header>

      {integrity && <div className="aviso" role="status">{integrity}</div>}
      {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
      {(error || listError) && <div className="aviso aviso--erro" role="alert">{error || listError}</div>}

      {formOpen ? (
        <form className="cartao" onSubmit={saveDriver}>
          <h2 className="cartao__titulo">{editingId ? 'Editar motorista' : 'Cadastrar motorista'}</h2>
          <fieldset className="secao">
            <legend>Dados pessoais</legend>
            <div className="grade">
              <Campo id="nome" rotulo="Nome completo" maxLength={200} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Campo id="email" rotulo="E-mail" type="email" maxLength={254} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Campo id="senha" rotulo="Senha (mínimo 10 caracteres)" type="password"
                value={form.password} minLength={10}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} />
            </div>
          </fieldset>
          <fieldset className="secao">
            <legend>Habilitação</legend>
            <div className="grade">
              <Campo id="cnh" rotulo="Número da CNH" inputMode="numeric" maxLength={11}
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.replace(/\D/g, '') })} />
              <Selecao id="categoria" rotulo="Categoria" opcoes={CATEGORIAS}
                value={form.licenseCategory}
                onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} />
              <Campo id="validade" rotulo="Validade da CNH" type="date"
                value={form.licenseExpiresAt}
                onChange={(e) => setForm({ ...form, licenseExpiresAt: e.target.value })} />
              <div className="campo campo--check">
                <label className="check">
                  <input type="checkbox" checked={form.hasPassengerTransportCourse}
                    onChange={(e) => setForm({ ...form, hasPassengerTransportCourse: e.target.checked })} />
                  Possui curso de transporte de passageiros
                </label>
              </div>
            </div>
          </fieldset>
          <fieldset className="secao">
            <legend>Observações</legend>
            <div className="campo">
              <label htmlFor="obs">Observações</label>
              <textarea id="obs" rows={3} maxLength={500} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </fieldset>
          <div className="acoes">
            <button type="button" className="botao botao--secundario" onClick={cancelForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar motorista'}
            </button>
          </div>
        </form>
      ) : (
        <section className="cartao">
          <h2 className="cartao__titulo">Motoristas cadastrados</h2>
          <div className="filtros">
            <input type="search" className="filtro" maxLength={200} placeholder="Buscar por nome, e-mail ou CNH"
              aria-label="Buscar motoristas" value={q} onChange={(e) => search(e.target.value)} />
          </div>
          {loading ? (
            <p role="status">Carregando motoristas…</p>
          ) : listError ? null : drivers.length === 0 ? (
            <p className="texto-suave">Nenhum motorista encontrado.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr><th>Nome</th><th>E-mail</th><th>Situação</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.user.name}</strong></td>
                      <td>{d.user.email}</td>
                      <td>
                        <span className={`status ${d.isActive ? 'status--ok' : 'status--erro'}`}>
                          {d.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <button className="link" type="button" onClick={() => openEdit(d)}>Editar</button>
                        {d.isActive && (
                          <button className="link" type="button" onClick={() => void inactivate(d)}>
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
          <button type="button" className="botao botao--secundario" onClick={reload} disabled={loading}>
            Atualizar lista
          </button>
        </section>
      )}
    </AppLayout>
  );
}
