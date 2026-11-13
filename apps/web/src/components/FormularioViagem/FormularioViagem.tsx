import { useState, type FormEvent } from "react";
import Campo from "../Campo";
import Selecao from "../Selecao";
import "./FormularioViagem.css";

interface FormularioViagemProps {
  onConcluir: (salvou: boolean) => void;
}

interface Passageiro {
  id: number;
  nome: string;
  procedimento: string;
  cidade: string;
  acompanhante: boolean;
}

interface VeiculoOpcao {
  id: string;
  nome: string;
  lugares: number;
}

interface FormViagem {
  destino: string;
  unidade: string;
  motivo: string;
  data: string;
  saida: string;
  localSaida: string;
  veiculo: string;
  motorista: string;
  observacoes: string;
  passageiros: number[];
}

const DESTINOS = ["Campinas", "Varginha", "Belo Horizonte", "São Paulo", "Itajubá"];
const MOTIVOS = ["Consulta", "Exame", "Procedimento", "Tratamento contínuo"];
const MOTORISTAS = ["Carlos Mendes", "Rogério Alves", "Ana Paula Reis", "Marcos Teixeira"];

const VEICULOS: VeiculoOpcao[] = [
  { id: "VAN-01", nome: "VAN-01 · Van", lugares: 15 },
  { id: "VAN-02", nome: "VAN-02 · Van", lugares: 12 },
  { id: "MIC-01", nome: "MIC-01 · Micro-ônibus", lugares: 28 },
  { id: "CAR-03", nome: "CAR-03 · Carro adaptado", lugares: 5 },
];

const PASSAGEIROS: Passageiro[] = [
  { id: 1, nome: "Maria das Graças Silva", procedimento: "Cardiologia", cidade: "Campinas", acompanhante: true },
  { id: 2, nome: "José Antônio Pereira", procedimento: "Quimioterapia", cidade: "São Paulo", acompanhante: true },
  { id: 3, nome: "Luzia Ferreira Costa", procedimento: "Ultrassonografia", cidade: "Varginha", acompanhante: false },
  { id: 4, nome: "Pedro Henrique Lima", procedimento: "Cirurgia ortopédica", cidade: "Belo Horizonte", acompanhante: true },
  { id: 5, nome: "Aparecida Rocha", procedimento: "Oftalmologia", cidade: "Itajubá", acompanhante: false },
  { id: 6, nome: "Antônio Carlos Souza", procedimento: "Hemodiálise", cidade: "Campinas", acompanhante: false },
];

const RESERVAS = [{ veiculo: "VAN-02", data: "2026-11-06" }];

const FORM_VAZIO: FormViagem = {
  destino: DESTINOS[0],
  unidade: "",
  motivo: MOTIVOS[0],
  data: "",
  saida: "",
  localSaida: "",
  veiculo: "",
  motorista: "",
  observacoes: "",
  passageiros: [],
};

export default function FormularioViagem({ onConcluir }: FormularioViagemProps) {
  const [form, setForm] = useState<FormViagem>(FORM_VAZIO);

  function atualizar<K extends keyof FormViagem>(campo: K, valor: FormViagem[K]) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function alternarPassageiro(id: number) {
    const marcados = form.passageiros.includes(id)
      ? form.passageiros.filter((p) => p !== id)
      : [...form.passageiros, id];
    atualizar("passageiros", marcados);
  }

  const veiculo = VEICULOS.find((v) => v.id === form.veiculo);
  const escolhidos = PASSAGEIROS.filter((p) => form.passageiros.includes(p.id));
  const acompanhantes = escolhidos.filter((p) => p.acompanhante).length;
  const ocupados = escolhidos.length + acompanhantes;
  const capacidade = veiculo?.lugares ?? 0;
  const excede = veiculo !== undefined && ocupados > capacidade;
  const percentual = capacidade > 0 ? Math.min(100, (ocupados / capacidade) * 100) : 0;
  const conflito = RESERVAS.some((r) => r.veiculo === form.veiculo && r.data === form.data);

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onConcluir(true);
  }

  return (
    <>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Nova viagem</h1>
          <p>Preencha os dados da viagem e escolha os passageiros.</p>
        </div>
        <div className="cabecalho__acoes">
          <button type="button" className="botao botao--secundario" onClick={() => onConcluir(false)}>
            ‹ Voltar para viagens
          </button>
        </div>
      </header>

      <form className="duas-colunas" onSubmit={aoEnviar}>
        <section className="cartao">
          <fieldset className="secao">
            <legend>Dados da viagem</legend>
            <div className="grade">
              <Selecao
                id="destino"
                rotulo="Destino"
                opcoes={DESTINOS}
                value={form.destino}
                onChange={(e) => atualizar("destino", e.target.value)}
              />
              <Campo
                id="unidade"
                rotulo="Unidade de saúde"
                placeholder="Hospital de Clínicas"
                value={form.unidade}
                onChange={(e) => atualizar("unidade", e.target.value)}
                required
              />
              <Selecao
                id="motivo"
                rotulo="Motivo"
                opcoes={MOTIVOS}
                value={form.motivo}
                onChange={(e) => atualizar("motivo", e.target.value)}
              />
              <Campo
                id="data"
                rotulo="Data"
                type="date"
                value={form.data}
                onChange={(e) => atualizar("data", e.target.value)}
                required
              />
              <Campo
                id="saida"
                rotulo="Horário de saída"
                type="time"
                value={form.saida}
                onChange={(e) => atualizar("saida", e.target.value)}
                required
              />
              <Campo
                id="local-saida"
                rotulo="Local de saída"
                placeholder="Praça da Saúde"
                value={form.localSaida}
                onChange={(e) => atualizar("localSaida", e.target.value)}
                required
              />
            </div>
          </fieldset>

          <fieldset className="secao">
            <legend>Veículo e motorista</legend>
            <div className="grade">
              <Selecao
                id="veiculo"
                rotulo="Veículo"
                opcoes={[
                  { valor: "", rotulo: "Selecione um veículo" },
                  ...VEICULOS.map((v) => ({ valor: v.id, rotulo: `${v.nome} · ${v.lugares} lugares` })),
                ]}
                value={form.veiculo}
                onChange={(e) => atualizar("veiculo", e.target.value)}
                required
              />
              <Selecao
                id="motorista"
                rotulo="Motorista"
                opcoes={[{ valor: "", rotulo: "Selecione um motorista" }, ...MOTORISTAS]}
                value={form.motorista}
                onChange={(e) => atualizar("motorista", e.target.value)}
                required
              />
            </div>
            {conflito && (
              <div className="aviso aviso--alerta" role="alert">
                Este veículo já tem uma viagem agendada nesta data. Escolha outro veículo ou outro dia.
              </div>
            )}
            <div className="campo">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                rows={3}
                placeholder="Ex.: paciente cadeirante, retorno no mesmo dia"
                value={form.observacoes}
                onChange={(e) => atualizar("observacoes", e.target.value)}
              />
            </div>
          </fieldset>

          <div className="acoes">
            <button type="button" className="botao botao--secundario" onClick={() => onConcluir(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={excede}>
              Salvar viagem
            </button>
          </div>
        </section>

        <section className="cartao">
          <h2 className="cartao__titulo">Passageiros</h2>
          <p className="texto-suave">
            Lugares ocupados (pacientes e acompanhantes):{" "}
            <strong className={excede ? "texto-erro" : undefined}>
              {ocupados}
              {veiculo ? ` de ${capacidade}` : ""}
            </strong>
          </p>
          <div
            className="medidor"
            role="progressbar"
            aria-label="Ocupação do veículo"
            aria-valuemin={0}
            aria-valuemax={capacidade}
            aria-valuenow={ocupados}
          >
            <i className={excede ? "medidor__erro" : undefined} style={{ width: `${percentual}%` }} />
          </div>

          {!veiculo && <p className="texto-suave">Escolha um veículo para ver a capacidade.</p>}
          {excede && (
            <div className="aviso aviso--erro" role="alert">
              Passageiros acima da capacidade do veículo.
            </div>
          )}

          <ul className="lista-passageiros">
            {PASSAGEIROS.map((p) => (
              <li key={p.id}>
                <label className="check passageiro">
                  <input
                    type="checkbox"
                    checked={form.passageiros.includes(p.id)}
                    onChange={() => alternarPassageiro(p.id)}
                  />
                  <span>
                    {p.nome}
                    <small>
                      {p.procedimento} · {p.cidade}
                      {p.acompanhante ? " · com acompanhante" : ""}
                    </small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </form>
    </>
  );
}
