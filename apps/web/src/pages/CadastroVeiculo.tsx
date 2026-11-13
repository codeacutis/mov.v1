import { useState, type FormEvent } from "react";
import AppLayout from "../components/AppLayout";
import Campo from "../components/Campo";
import Selecao from "../components/Selecao";

interface CadastroVeiculoProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface FormVeiculo {
  placa: string;
  identificacao: string;
  modelo: string;
  ano: string;
  tipo: string;
  lugares: string;
  acessivel: boolean;
  combustivel: string;
  kmAtual: string;
  proximaRevisao: string;
  situacao: string;
  observacoes: string;
}

const TIPOS = ["Van", "Micro-ônibus", "Ônibus", "Carro", "Carro adaptado", "Ambulância"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico"];
const SITUACOES = ["Disponível", "Em manutenção"];

const FORM_VAZIO: FormVeiculo = {
  placa: "",
  identificacao: "",
  modelo: "",
  ano: "",
  tipo: TIPOS[0],
  lugares: "",
  acessivel: false,
  combustivel: COMBUSTIVEIS[0],
  kmAtual: "",
  proximaRevisao: "",
  situacao: SITUACOES[0],
  observacoes: "",
};

export default function CadastroVeiculo({ onNavegar, onSair }: CadastroVeiculoProps) {
  const [form, setForm] = useState<FormVeiculo>(FORM_VAZIO);
  const [salvo, setSalvo] = useState(false);

  function atualizar<K extends keyof FormVeiculo>(campo: K, valor: FormVeiculo[K]) {
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
    <AppLayout ativo="Veículos" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>Cadastrar veículo</h1>
        <p>Preencha os dados para incluir um veículo na frota municipal.</p>
      </header>

      {salvo && (
        <div className="aviso aviso--ok" role="status">
          Veículo cadastrado com sucesso.
        </div>
      )}

      <form className="cartao" onSubmit={aoEnviar}>
        <fieldset className="secao">
          <legend>Identificação</legend>
          <div className="grade">
            <Campo
              id="placa"
              rotulo="Placa"
              placeholder="ABC1D23"
              maxLength={7}
              value={form.placa}
              onChange={(e) => atualizar("placa", e.target.value.toUpperCase())}
              required
            />
            <Campo
              id="identificacao"
              rotulo="Identificação na frota"
              placeholder="VAN-03"
              value={form.identificacao}
              onChange={(e) => atualizar("identificacao", e.target.value.toUpperCase())}
              required
            />
            <Campo
              id="modelo"
              rotulo="Marca e modelo"
              placeholder="Mercedes Sprinter"
              value={form.modelo}
              onChange={(e) => atualizar("modelo", e.target.value)}
              required
            />
            <Campo
              id="ano"
              rotulo="Ano de fabricação"
              type="number"
              min={1990}
              max={2100}
              placeholder="2022"
              value={form.ano}
              onChange={(e) => atualizar("ano", e.target.value)}
              required
            />
          </div>
        </fieldset>

        <fieldset className="secao">
          <legend>Características</legend>
          <div className="grade">
            <Selecao
              id="tipo"
              rotulo="Tipo de veículo"
              opcoes={TIPOS}
              value={form.tipo}
              onChange={(e) => atualizar("tipo", e.target.value)}
            />
            <Campo
              id="lugares"
              rotulo="Lugares para passageiros"
              type="number"
              min={1}
              placeholder="12"
              value={form.lugares}
              onChange={(e) => atualizar("lugares", e.target.value)}
              required
            />
            <Selecao
              id="combustivel"
              rotulo="Combustível"
              opcoes={COMBUSTIVEIS}
              value={form.combustivel}
              onChange={(e) => atualizar("combustivel", e.target.value)}
            />
            <div className="campo campo--check">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.acessivel}
                  onChange={(e) => atualizar("acessivel", e.target.checked)}
                />
                Possui elevador ou rampa para cadeirante
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="secao">
          <legend>Uso e manutenção</legend>
          <div className="grade">
            <Campo
              id="km"
              rotulo="Quilometragem atual"
              type="number"
              min={0}
              placeholder="48210"
              value={form.kmAtual}
              onChange={(e) => atualizar("kmAtual", e.target.value)}
              required
            />
            <Campo
              id="revisao"
              rotulo="Próxima revisão"
              type="date"
              value={form.proximaRevisao}
              onChange={(e) => atualizar("proximaRevisao", e.target.value)}
            />
            <Selecao
              id="situacao"
              rotulo="Situação inicial"
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
              placeholder="Ex.: ar-condicionado com defeito, uso exclusivo da Saúde"
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
            Salvar veículo
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
