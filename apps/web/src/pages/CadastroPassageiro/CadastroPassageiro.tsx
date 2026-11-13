import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AppLayout from '../../components/AppLayout';
import Campo from '../../components/Campo';
import { apiRequest, ApiRequestError } from '../../services/api';
import { mascaraTelefone } from '../../utils/mascaras';

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
  address: string;
  usesWheelchair: boolean;
  hasReducedMobility: boolean;
  needsBoardingAssistance: boolean;
  operationalNotes: string;
}

const EMPTY_FORM: PatientForm = {
  name: '',
  birthDate: '',
  phone: '',
  susCardNumber: '',
  address: '',
  usesWheelchair: false,
  hasReducedMobility: false,
  needsBoardingAssistance: false,
  operationalNotes: '',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 401)
    return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error instanceof ApiRequestError && error.status === 403)
    return 'Seu usuário não tem permissão para gerenciar pacientes.';
  if (error instanceof TypeError)
    return 'Não foi possível acessar a API. Confira se o backend está em execução.';
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function CadastroPassageiro({ onNavegar, onSair }: CadastroPassageiroProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPatients(await apiRequest<Patient[]>('/patients'));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPatients(); }, [loadPatients]);

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
      address: p.address ?? '',
      usesWheelchair: p.usesWheelchair,
      hasReducedMobility: p.hasReducedMobility,
      needsBoardingAssistance: p.needsBoardingAssistance,
      operationalNotes: p.operationalNotes ?? '',
    });
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      name: form.name.trim(),
      birthDate: form.birthDate,
      phone: form.phone.trim() || undefined,
      susCardNumber: form.susCardNumber.trim() || undefined,
      address: form.address.trim() || undefined,
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
      await loadPatients();
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
      await loadPatients();
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
      {error && <div className="aviso aviso--erro" role="alert">{error}</div>}

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
              <Campo id="endereco" rotulo="Endereço" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
          {loading ? (
            <p role="status">Carregando pacientes…</p>
          ) : patients.length === 0 ? (
            <p className="texto-suave">Nenhum paciente cadastrado.</p>
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
          <button type="button" className="botao botao--secundario" onClick={() => void loadPatients()} disabled={loading}>
            Atualizar lista
          </button>
        </section>
      )}
    </AppLayout>
  );
}
