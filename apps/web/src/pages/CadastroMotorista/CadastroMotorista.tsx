import { useState, type FormEvent, type ReactNode } from 'react';
import Campo from '../../components/Campo';
import Selecao from '../../components/Selecao';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import './CadastroMotorista.css';

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

/* ==================== COMPONENTE CADASTRO DE MOTORISTA ==================== */

interface CadastroMotoristaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface Driver {
  id: string;
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
  const [saving, setSaving] = useState(false);
  const [searchType, setSearchType] = useState<'name' | 'email'>('name');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function openForm() {
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
      password: form.password,
      licenseNumber: form.licenseNumber.trim() || undefined,
      licenseCategory: form.licenseCategory || undefined,
      licenseExpiresAt: form.licenseExpiresAt || undefined,
      hasPassengerTransportCourse: form.hasPassengerTransportCourse,
      notes: form.notes.trim() || undefined,
    };
    try {
      await apiRequest<Driver>('/drivers', { method: 'POST', body: JSON.stringify(payload) });
      setNotice('Motorista cadastrado.');
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
          <button type="button" className="botao botao--primario" onClick={openForm}>
            Novo motorista
          </button>
        )}
      </header>

      {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
      {(error || listError) && <div className="aviso aviso--erro" role="alert">{error || listError}</div>}

      {formOpen ? (
        <form className="cartao" onSubmit={saveDriver}>
          <h2 className="cartao__titulo">Cadastrar motorista</h2>
          <fieldset className="secao">
            <legend>Dados pessoais</legend>
            <div className="grade">
              <Campo id="nome" rotulo="Nome completo" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Campo id="email" rotulo="E-mail" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Campo id="senha" rotulo="Senha (mínimo 10 caracteres)" type="password"
                value={form.password} minLength={10}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required />
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
              <textarea id="obs" rows={3} value={form.notes}
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
          <div className="filtros motoristas__filtros">
            <select
              className="motoristas__tipo-busca"
              aria-label="Tipo de busca"
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as 'name' | 'email');
                search('');
              }}
            >
              <option value="name">Nome</option>
              <option value="email">E-mail</option>
            </select>
            <input
              type="search"
              className="filtro motoristas__campo-busca"
              placeholder={searchType === 'name' ? 'Buscar pelo nome' : 'Buscar pelo e-mail'}
              aria-label={searchType === 'name' ? 'Buscar pelo nome' : 'Buscar pelo e-mail'}
              value={q}
              onChange={(e) => search(e.target.value)}
            />
          </div>
          {loading ? (
            <p role="status">Carregando motoristas…</p>
          ) : drivers.length === 0 ? (
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