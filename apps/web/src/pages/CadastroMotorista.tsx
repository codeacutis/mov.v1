import { useState, type FormEvent } from "react";
import AppLayout from "../components/AppLayout";
import Campo from "../components/Campo";
import Selecao from "../components/Selecao";
import { mascaraCpf, mascaraTelefone } from "../utils/mascaras";

interface CadastroMotoristaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface FormMotorista {
  nome: string;
  cpf: string;
  nascimento: string;
  telefone: string;
  email: string;
  cnhNumero: string;
  cnhCategoria: string;
  cnhValidade: string;
  cursoTransporte: boolean;
  situacao: string;
  observacoes: string;
}

const CATEGORIAS = ["B", "C", "D", "E"];
const SITUACOES = ["Ativo", "De folga", "Afastado"];

const FORM_VAZIO: FormMotorista = {
  nome: "",
  cpf: "",
  nascimento: "",
  telefone: "",
  email: "",
  cnhNumero: "",
  cnhCategoria: "D",
  cnhValidade: "",
  cursoTransporte: false,
  situacao: SITUACOES[0],
  observacoes: "",
};

export default function CadastroMotorista({ onNavegar, onSair }: CadastroMotoristaProps) {
  const [form, setForm] = useState<FormMotorista>(FORM_VAZIO);
  const [salvo, setSalvo] = useState(false);

  function atualizar<K extends keyof FormMotorista>(campo: K, valor: FormMotorista[K]) {
    setSalvo(false);
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  // Tela apenas visual: nada é enviado, só exibe a confirmação e limpa o formulário.
  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForm(FORM_VAZIO);
    setSalvo(true);
  }

  function aoCancelar() {
    setForm(FORM_VAZIO);
    setSalvo(false);
  }

  return (
    <AppLayout ativo="Motoristas" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>Cadastrar motorista</h1>
        <p>Inclua um motorista vinculado ao transporte municipal.</p>
      </header>

      {salvo && (
        <div className="aviso aviso--ok" role="status">
          Motorista cadastrado com sucesso.
        </div>
      )}

      <form className="cartao" onSubmit={aoEnviar}>
        <fieldset className="secao">
          <legend>Dados pessoais</legend>
          <div className="grade">
            <Campo
              id="nome"
              rotulo="Nome completo"
              autoComplete="name"
              value={form.nome}
              onChange={(e) => atualizar("nome", e.target.value)}
              required
            />
            <Campo
              id="cpf"
              rotulo="CPF"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => atualizar("cpf", mascaraCpf(e.target.value))}
              required
            />
            <Campo
              id="nascimento"
              rotulo="Data de nascimento"
              type="date"
              value={form.nascimento}
              onChange={(e) => atualizar("nascimento", e.target.value)}
              required
            />
            <Campo
              id="telefone"
              rotulo="Telefone"
              type="tel"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => atualizar("telefone", mascaraTelefone(e.target.value))}
              required
            />
            <Campo
              id="email"
              rotulo="E-mail"
              type="email"
              autoComplete="email"
              placeholder="nome@prefeitura.gov.br"
              value={form.email}
              onChange={(e) => atualizar("email", e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="secao">
          <legend>Habilitação</legend>
          <div className="grade">
            <Campo
              id="cnh"
              rotulo="Número da CNH"
              inputMode="numeric"
              maxLength={11}
              value={form.cnhNumero}
              onChange={(e) => atualizar("cnhNumero", e.target.value.replace(/\D/g, ""))}
              required
            />
            <Selecao
              id="categoria"
              rotulo="Categoria"
              opcoes={CATEGORIAS}
              value={form.cnhCategoria}
              onChange={(e) => atualizar("cnhCategoria", e.target.value)}
            />
            <Campo
              id="validade"
              rotulo="Validade da CNH"
              type="date"
              value={form.cnhValidade}
              onChange={(e) => atualizar("cnhValidade", e.target.value)}
              required
            />
            <div className="campo campo--check">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.cursoTransporte}
                  onChange={(e) => atualizar("cursoTransporte", e.target.checked)}
                />
                Possui curso de transporte de passageiros
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="secao">
          <legend>Vínculo</legend>
          <div className="grade">
            <Selecao
              id="situacao"
              rotulo="Situação"
              opcoes={SITUACOES}
              value={form.situacao}
              onChange={(e) => atualizar("situacao", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              rows={3}
              placeholder="Ex.: disponível apenas no período da manhã"
              value={form.observacoes}
              onChange={(e) => atualizar("observacoes", e.target.value)}
            />
          </div>
        </fieldset>

        <div className="acoes">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
            Cancelar
          </button>
          <button type="submit" className="botao botao--primario">
            Salvar motorista
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
