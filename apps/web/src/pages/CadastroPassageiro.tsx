import { useState, type FormEvent } from "react";
import AppLayout from "../components/AppLayout";
import Campo from "../components/Campo";
import Selecao from "../components/Selecao";
import { mascaraCartaoSus, mascaraCpf, mascaraTelefone } from "../utils/mascaras";

interface CadastroPassageiroProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface FormPassageiro {
  nome: string;
  nascimento: string;
  cpf: string;
  cartaoSus: string;
  telefone: string;
  endereco: string;
  bairro: string;
  destino: string;
  procedimento: string;
  mobilidade: string;
  precisaAcompanhante: boolean;
  nomeAcompanhante: string;
  observacoes: string;
}

const DESTINOS = ["Campinas", "Varginha", "Belo Horizonte", "São Paulo", "Itajubá"];
const MOBILIDADES = ["Anda sem ajuda", "Dificuldade de locomoção", "Cadeirante", "Maca"];

const FORM_VAZIO: FormPassageiro = {
  nome: "",
  nascimento: "",
  cpf: "",
  cartaoSus: "",
  telefone: "",
  endereco: "",
  bairro: "",
  destino: DESTINOS[0],
  procedimento: "",
  mobilidade: MOBILIDADES[0],
  precisaAcompanhante: false,
  nomeAcompanhante: "",
  observacoes: "",
};

export default function CadastroPassageiro({ onNavegar, onSair }: CadastroPassageiroProps) {
  const [form, setForm] = useState<FormPassageiro>(FORM_VAZIO);
  const [salvo, setSalvo] = useState(false);

  function atualizar<K extends keyof FormPassageiro>(campo: K, valor: FormPassageiro[K]) {
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
    <AppLayout ativo="Passageiros" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>Cadastrar passageiro</h1>
        <p>Inclua o paciente e, se precisar, o acompanhante.</p>
      </header>

      {salvo && (
        <div className="aviso aviso--ok" role="status">
          Passageiro cadastrado com sucesso.
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
              id="nascimento"
              rotulo="Data de nascimento"
              type="date"
              value={form.nascimento}
              onChange={(e) => atualizar("nascimento", e.target.value)}
              required
            />
            <Campo
              id="cartao-sus"
              rotulo="Cartão SUS"
              inputMode="numeric"
              placeholder="000 0000 0000 0000"
              value={form.cartaoSus}
              onChange={(e) => atualizar("cartaoSus", mascaraCartaoSus(e.target.value))}
              required
            />
            <Campo
              id="cpf"
              rotulo="CPF"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => atualizar("cpf", mascaraCpf(e.target.value))}
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
          </div>
        </fieldset>

        <fieldset className="secao">
          <legend>Endereço de embarque</legend>
          <div className="grade">
            <Campo
              id="endereco"
              rotulo="Rua e número"
              autoComplete="street-address"
              value={form.endereco}
              onChange={(e) => atualizar("endereco", e.target.value)}
              required
            />
            <Campo
              id="bairro"
              rotulo="Bairro ou comunidade"
              value={form.bairro}
              onChange={(e) => atualizar("bairro", e.target.value)}
              required
            />
          </div>
        </fieldset>

        <fieldset className="secao">
          <legend>Atendimento e transporte</legend>
          <div className="grade">
            <Selecao
              id="destino"
              rotulo="Destino habitual"
              opcoes={DESTINOS}
              value={form.destino}
              onChange={(e) => atualizar("destino", e.target.value)}
            />
            <Campo
              id="procedimento"
              rotulo="Procedimento ou especialidade"
              placeholder="Cardiologia, hemodiálise..."
              value={form.procedimento}
              onChange={(e) => atualizar("procedimento", e.target.value)}
              required
            />
            <Selecao
              id="mobilidade"
              rotulo="Mobilidade"
              opcoes={MOBILIDADES}
              value={form.mobilidade}
              onChange={(e) => atualizar("mobilidade", e.target.value)}
            />
            <div className="campo campo--check">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.precisaAcompanhante}
                  onChange={(e) => atualizar("precisaAcompanhante", e.target.checked)}
                />
                Precisa de acompanhante
              </label>
            </div>
            {form.precisaAcompanhante && (
              <Campo
                id="acompanhante"
                rotulo="Nome do acompanhante"
                value={form.nomeAcompanhante}
                onChange={(e) => atualizar("nomeAcompanhante", e.target.value)}
                required
              />
            )}
          </div>
          <div className="campo">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              rows={3}
              placeholder="Ex.: usa oxigênio, precisa de assento na frente"
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
            Salvar passageiro
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
