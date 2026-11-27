import { useRef, useState, type FormEvent } from 'react';
import AppLayout from '../../components/AppLayout';
import Campo from '../../components/Campo';
import Paginacao from '../../components/Paginacao';
import { apiRequest, apiErrorMessage } from '../../services/api';
import { apenasDigitos, mascaraTelefone, mascaraCartaoSus } from '../../utils/mascaras';
import { isValidCns } from '../../utils/cns';
import { usePaginatedList } from '../../hooks/usePaginatedList';

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
  const [cepError, setCepError] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const cepBuscado = useRef('');
  const cepRequest = useRef<AbortController | null>(null);

  function openCreateForm() {
    cepRequest.current?.abort();
    cepBuscado.current = '';
    setCepError('');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function openEditForm(p: Patient) {
    cepRequest.current?.abort();
    cepBuscado.current = '';
    setEditingId(p.id);
    setForm({
      name: p.name,
      birthDate: p.birthDate.slice(0, 10),
      phone: p.phone ?? '',
      susCardNumber: mascaraCartaoSus(p.susCardNumber ?? ''),
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
    cepRequest.current?.abort();
    setBuscandoCep(false);
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setCepError('');
    cepBuscado.current = '';
  }

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (!cepLimpo) return;
    if (cepLimpo.length !== 8) {
      setCepError('Informe um CEP com 8 dígitos ou deixe o campo vazio.');
      return;
    }
    if (cepLimpo === cepBuscado.current) return;
    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;
    cepBuscado.current = cepLimpo;
    setBuscandoCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, { signal: controller.signal });
      if (!res.ok) throw new Error();
      const data: ViaCepResponse = await res.json();
      if (controller.signal.aborted) return;
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique e tente novamente.');
        cepBuscado.current = '';
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
      if (controller.signal.aborted) return;
      cepBuscado.current = '';
      setCepError('Serviço de CEP indisponível. Preencha o endereço manualmente.');
    } finally {
      if (cepRequest.current === controller) setBuscandoCep(false);
    }
  }

  async function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const cns = apenasDigitos(form.susCardNumber);
    if (form.susCardNumber && !isValidCns(cns)) {
      setError('Informe um Cartão SUS válido com 15 dígitos ou deixe o campo vazio.'); return;
    }
    if (montarEndereco(form).length > 300) {
      setError('O endereço completo deve ter no máximo 300 caracteres. Abrevie os campos do endereço.'); return;
    }
    if (form.cep && form.cep.replace(/\D/g, '').length !== 8) {
      setCepError('Informe um CEP com 8 dígitos ou deixe o campo vazio.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const enderecoMontado = montarEndereco(form);
    const payload = {
      name: form.name.trim(),
      birthDate: form.birthDate,
      phone: form.phone.trim() || '',
      susCardNumber: cns,
      address: enderecoMontado || '',
      usesWheelchair: form.usesWheelchair,
      hasReducedMobility: form.hasReducedMobility,
      needsBoardingAssistance: form.needsBoardingAssistance,
      operationalNotes: form.operationalNotes.trim() || '',
    };
    try {
      if (editingId) {
        await apiRequest<Patient>(`/patients/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice('Paciente atualizado.');
      } else {
        await apiRequest<Patient>('/patients', { method: 'POST', body: JSON.stringify(payload) });
        setNotice('Paciente cadastrado.');
      }
      cepRequest.current?.abort();
      setBuscandoCep(false);
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
          <button className="botao botao--primario" onClick={openCreateForm}>
            Novo paciente
          </button>
        )}
      </header>

      {notice && <div className="aviso aviso--ok" role="status">{notice}</div>}
      {(error || listError) && <div className="aviso aviso--erro" role="alert">{error || listError}</div>}

      {formOpen ? (
        <form className="cartao" onSubmit={savePatient}>
          <h2 className="cartao__titulo">{editingId ? 'Editar paciente' : 'Cadastrar paciente'}</h2>
          <p className="texto-suave">Nome, data de nascimento e telefone são obrigatórios. Os demais campos são opcionais.</p>
          <fieldset className="secao">
            <legend>Dados pessoais</legend>
            <div className="grade">
              <Campo id="nome" rotulo="Nome completo" maxLength={200} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Campo id="nascimento" rotulo="Data de nascimento" type="date" value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })} required />
              <Campo id="telefone" rotulo="Telefone" type="tel" inputMode="tel" maxLength={20}
                placeholder="(00) 00000-0000" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: mascaraTelefone(e.target.value) })} required />
              <div><Campo id="sus" rotulo="Cartão SUS (opcional)" inputMode="numeric" maxLength={18} pattern="[0-9]{3} [0-9]{4} [0-9]{4} [0-9]{4}" aria-describedby="sus-ajuda"
                placeholder="000 0000 0000 0000" value={form.susCardNumber}
                onChange={(e) => setForm({ ...form, susCardNumber: mascaraCartaoSus(e.target.value) })} />
              <p id="sus-ajuda" className="texto-suave">Se informado, use os 15 dígitos do CNS. O dígito verificador será validado.</p></div>
              <Campo id="cep" rotulo="CEP (opcional)" inputMode="numeric" placeholder="00000-000"
                value={form.cep} maxLength={9}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2');
                  cepRequest.current?.abort();
                  setBuscandoCep(false);
                  setCepError('');
                  cepBuscado.current = '';
                  setForm({ ...form, cep: v });
                }}
                onBlur={(e) => void buscarCep(e.target.value)}
                adorno={buscandoCep ? <span className="campo__adorno">⏳</span> : undefined}
              />
              {cepError && <p className="campo__erro" role="alert">{cepError}</p>}
              <Campo id="logradouro" rotulo="Logradouro (opcional)" maxLength={120} value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
              <Campo id="numero" rotulo="Número (opcional)" maxLength={12} value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              <Campo id="complemento" rotulo="Complemento (opcional)" maxLength={300} value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
              <Campo id="bairro" rotulo="Bairro (opcional)" maxLength={60} value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
              <Campo id="cidade" rotulo="Cidade (opcional)" maxLength={100} value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              <Campo id="uf" rotulo="UF (opcional)" value={form.uf} maxLength={2}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </div>
          </fieldset>
          <fieldset className="secao">
            <legend>Mobilidade (opcional)</legend>
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
            <legend>Observações operacionais (opcional)</legend>
            <div className="campo">
              <label htmlFor="obs">Observações (opcional, até 500 caracteres)</label>
              <textarea id="obs" rows={3} placeholder="Ex.: usa oxigênio, precisa de assento na frente"
                value={form.operationalNotes} maxLength={500}
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
          <div className="filtros">
            <input type="search" className="filtro" maxLength={200} placeholder="Buscar por nome, telefone ou cartão SUS"
              aria-label="Buscar pacientes" value={q} onChange={(e) => search(e.target.value)} />
          </div>
          {loading ? (
            <p role="status">Carregando pacientes…</p>
          ) : listError ? null : patients.length === 0 ? (
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
