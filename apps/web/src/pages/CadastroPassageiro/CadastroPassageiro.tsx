import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import Campo from '../../components/Campo';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { mascaraTelefone } from '../../utils/mascaras';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import './CadastroPassageiro.css';

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

/* ==================== COMPONENTE CADASTRO DE PASSAGEIRO ==================== */

interface CadastroPassageiroProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface Patient {
  id: string;
  name: string;
  birthDate: string;
  phone: string | null;
  susCardNumber: string | null;
  address: string | null;
  usesWheelchair: boolean;
  hasReducedMobility: boolean;
  needsBoardingAssistance: boolean;
  operationalNotes: string | null;
  isActive: boolean;
}

interface PatientForm {
  name: string;
  birthDate: string;
  phone: string;
  susCardNumber: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento: string;
  usesWheelchair: boolean;
  hasReducedMobility: boolean;
  needsBoardingAssistance: boolean;
  operationalNotes: string;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

const EMPTY_FORM: PatientForm = {
  name: '',
  birthDate: '',
  phone: '',
  susCardNumber: '',
  cep: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  numero: '',
  complemento: '',
  usesWheelchair: false,
  hasReducedMobility: false,
  needsBoardingAssistance: false,
  operationalNotes: '',
};

function montarEndereco(f: PatientForm): string {
  const partes = [
    f.logradouro,
    f.numero ? `nº ${f.numero}` : '',
    f.complemento,
    f.bairro,
    f.cidade && f.uf ? `${f.cidade}/${f.uf}` : f.cidade || f.uf,
    f.cep ? `CEP ${f.cep}` : '',
  ];
  return partes.filter(Boolean).join(', ');
}

function errorMessage(error: unknown): string {
  return apiErrorMessage(error);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function CadastroPassageiro({ onNavegar, onSair }: CadastroPassageiroProps) {
  const { data: patients, loading, error: listError, page, totalPages, q, search, goTo, reload } =
    usePaginatedList<Patient>('/patients');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [cepError, setCepError] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const cepBuscado = useRef('');

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function openEditForm(p: Patient) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      birthDate: p.birthDate.slice(0, 10),
      phone: p.phone ?? '',
      susCardNumber: p.susCardNumber ?? '',
      cep: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      uf: '',
      numero: '',
      complemento: p.address ?? '',
      usesWheelchair: p.usesWheelchair,
      hasReducedMobility: p.hasReducedMobility,
      needsBoardingAssistance: p.needsBoardingAssistance,
      operationalNotes: p.operationalNotes ?? '',
    });
    setCepError('');
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setCepError('');
    cepBuscado.current = '';
  }

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8 || cepLimpo === cepBuscado.current) return;
    cepBuscado.current = cepLimpo;
    setBuscandoCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (!res.ok) throw new Error();
      const data: ViaCepResponse = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique e tente novamente.');
        setForm((f) => ({ ...f, logradouro: '', bairro: '', cidade: '', uf: '' }));
      } else {
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro ?? '',
          bairro: data.bairro ?? '',
          cidade: data.localidade ?? '',
          uf: data.uf ?? '',
        }));
      }
    } catch {
      setCepError('Serviço de CEP indisponível. Preencha o endereço manualmente.');
    } finally {
      setBuscandoCep(false);
    }
  }

  async function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const enderecoMontado = montarEndereco(form);
    const payload = {
      name: form.name.trim(),
      birthDate: form.birthDate,
      phone: form.phone.trim() || undefined,
      susCardNumber: form.susCardNumber.trim() || undefined,
      address: enderecoMontado || undefined,
      usesWheelchair: form.usesWheelchair,
      hasReducedMobility: form.hasReducedMobility,
      needsBoardingAssistance: form.needsBoardingAssistance,
      operationalNotes: form.operationalNotes.trim() || undefined,
    };
    try {
      if (editingId) {
        await apiRequest<Patient>(`/patients/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice('Paciente atualizado.');
      } else {
        await apiRequest<Patient>('/patients', { method: 'POST', body: JSON.stringify(payload) });
        setNotice('Paciente cadastrado.');
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

  async function inactivate(p: Patient) {
    if (!window.confirm(`Inativar o paciente ${p.name}?`)) return;
    setError('');
    setNotice('');
    try {
      await apiRequest<Patient>(`/patients/${p.id}/inactivate`, { method: 'PATCH' });
      setNotice(`Paciente ${p.name} inativado.`);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <AppLayout ativo="Passageiros" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Pacientes</h1>
          <p>Cadastre e mantenha os pacientes do transporte municipal.</p>
        </div>
        {!formOpen && (
          <button type="button" className="botao botao--primario" onClick={openCreateForm}>
            Novo paciente
          </button>
        )}
      </header>

      {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
      {(error || listError) && <div className="aviso aviso--erro" role="alert">{error || listError}</div>}

      {formOpen ? (
        <form className="cartao" onSubmit={savePatient}>
          <h2 className="cartao__titulo">{editingId ? 'Editar paciente' : 'Cadastrar paciente'}</h2>
          <fieldset className="secao">
            <legend>Dados pessoais</legend>
            <div className="grade">
              <Campo id="nome" rotulo="Nome completo" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Campo id="nascimento" rotulo="Data de nascimento" type="date" value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })} required />
              <Campo id="telefone" rotulo="Telefone" type="tel" inputMode="tel"
                placeholder="(00) 00000-0000" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: mascaraTelefone(e.target.value) })} />
              <Campo id="sus" rotulo="Cartão SUS" inputMode="numeric"
                placeholder="000 0000 0000 0000" value={form.susCardNumber}
                onChange={(e) => setForm({ ...form, susCardNumber: e.target.value })} />
              <Campo id="cep" rotulo="CEP" inputMode="numeric" placeholder="00000-000"
                value={form.cep} maxLength={9}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2');
                  setCepError('');
                  cepBuscado.current = '';
                  setForm({ ...form, cep: v });
                }}
                onBlur={(e) => void buscarCep(e.target.value)}
                adorno={buscandoCep ? <span className="campo__adorno">⏳</span> : undefined}
              />
              {cepError && <p className="campo__erro" role="alert">{cepError}</p>}
              <Campo id="logradouro" rotulo="Logradouro" value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
              <Campo id="numero" rotulo="Número" value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              <Campo id="complemento" rotulo="Complemento" value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
              <Campo id="bairro" rotulo="Bairro" value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              <Campo id="cidade" rotulo="Cidade" value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              <Campo id="uf" rotulo="UF" value={form.uf} maxLength={2}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </div>
          </fieldset>
          <fieldset className="secao">
            <legend>Mobilidade</legend>
            <div className="grade">
              <div className="campo campo--check">
                <label className="check">
                  <input type="checkbox" checked={form.usesWheelchair}
                    onChange={(e) => setForm({ ...form, usesWheelchair: e.target.checked })} />
                  Usa cadeira de rodas
                </label>
              </div>
              <div className="campo campo--check">
                <label className="check">
                  <input type="checkbox" checked={form.hasReducedMobility}
                    onChange={(e) => setForm({ ...form, hasReducedMobility: e.target.checked })} />
                  Mobilidade reduzida
                </label>
              </div>
              <div className="campo campo--check">
                <label className="check">
                  <input type="checkbox" checked={form.needsBoardingAssistance}
                    onChange={(e) => setForm({ ...form, needsBoardingAssistance: e.target.checked })} />
                  Precisa de auxílio no embarque
                </label>
              </div>
            </div>
          </fieldset>
          <fieldset className="secao">
            <legend>Observações operacionais</legend>
            <div className="campo">
              <label htmlFor="obs">Observações</label>
              <textarea id="obs" rows={3} placeholder="Ex.: usa oxigênio, precisa de assento na frente"
                value={form.operationalNotes}
                onChange={(e) => setForm({ ...form, operationalNotes: e.target.value })} />
            </div>
          </fieldset>
          <div className="acoes">
            <button type="button" className="botao botao--secundario" onClick={cancelForm} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar paciente'}
            </button>
          </div>
        </form>
      ) : (
        <section className="cartao">
          <h2 className="cartao__titulo">Pacientes cadastrados</h2>
          <div className="filtros passageiros__filtros">
            <select
              className="passageiros__tipo-busca"
              aria-label="Tipo de busca"
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as 'name' | 'phone');
                search('');
              }}
            >
              <option value="name">Nome</option>
              <option value="phone">Telefone</option>
            </select>
            <input
              type="search"
              className="filtro passageiros__campo-busca"
              placeholder={searchType === 'name' ? 'Buscar pelo nome' : 'Buscar pelo telefone'}
              aria-label={searchType === 'name' ? 'Buscar pelo nome' : 'Buscar pelo telefone'}
              value={q}
              onChange={(e) => search(e.target.value)}
            />
          </div>
          {loading ? (
            <p role="status">Carregando pacientes…</p>
          ) : patients.length === 0 ? (
            <p className="texto-suave">Nenhum paciente encontrado.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr><th>Nome</th><th>Nascimento</th><th>Telefone</th><th>Situação</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{formatDate(p.birthDate)}</td>
                      <td>{p.phone || '—'}</td>
                      <td>
                        <span className={`status ${p.isActive ? 'status--ok' : 'status--erro'}`}>
                          {p.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="veiculos__acoes">
                        <button className="link" type="button" onClick={() => openEditForm(p)}>Editar</button>
                        {p.isActive && (
                          <button className="link veiculos__inativar" type="button" onClick={() => void inactivate(p)}>
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