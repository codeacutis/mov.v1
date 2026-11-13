import { useState } from "react";
import AppLayout from "../components/AppLayout";
import FormularioViagem from "../components/FormularioViagem";

interface ViagensProps {
  /** Abre direto o formulário de nova viagem. */
  iniciarCriando?: boolean;
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type Situacao = "andamento" | "agendada" | "aguardando" | "concluida" | "cancelada";
type Aba = "todas" | "hoje" | "sem-motorista";

interface Viagem {
  id: string;
  /** Dias em relação a hoje (0 = hoje, 1 = amanhã, -2 = há dois dias...) */
  offset: number;
  hora: string;
  destino: string;
  unidade: string;
  motivo: string;
  veiculo: string | null;
  motorista: string | null;
  passageiros: number;
  situacao: Situacao;
}

// Dados de exemplo: no sistema real virão do backend.
const VIAGENS: Viagem[] = [
  { id: "V-0241", offset: 0, hora: "05:30", destino: "Campinas", unidade: "Hospital de Clínicas", motivo: "Consulta", veiculo: "VAN-02", motorista: "Carlos Mendes", passageiros: 8, situacao: "andamento" },
  { id: "V-0242", offset: 0, hora: "06:00", destino: "Varginha", unidade: "Hospital Bom Samaritano", motivo: "Exame", veiculo: "MIC-01", motorista: "Rogério Alves", passageiros: 14, situacao: "andamento" },
  { id: "V-0243", offset: 0, hora: "13:00", destino: "Belo Horizonte", unidade: "Hospital das Clínicas", motivo: "Procedimento", veiculo: "VAN-01", motorista: "Ana Paula Reis", passageiros: 6, situacao: "agendada" },
  { id: "V-0244", offset: 1, hora: "05:00", destino: "São Paulo", unidade: "Hospital do Câncer", motivo: "Tratamento", veiculo: "VAN-02", motorista: "Carlos Mendes", passageiros: 5, situacao: "agendada" },
  { id: "V-0245", offset: 1, hora: "06:30", destino: "Itajubá", unidade: "Santa Casa", motivo: "Consulta", veiculo: null, motorista: null, passageiros: 9, situacao: "aguardando" },
  { id: "V-0238", offset: -2, hora: "05:30", destino: "Campinas", unidade: "Hospital de Clínicas", motivo: "Consulta", veiculo: "VAN-01", motorista: "Ana Paula Reis", passageiros: 7, situacao: "concluida" },
  { id: "V-0236", offset: -3, hora: "07:00", destino: "Varginha", unidade: "Hospital Bom Samaritano", motivo: "Exame", veiculo: "MIC-01", motorista: "Rogério Alves", passageiros: 12, situacao: "cancelada" },
];

const SITUACOES: Record<Situacao, { texto: string; classe: string }> = {
  andamento: { texto: "Em andamento", classe: "status--ok" },
  agendada: { texto: "Agendada", classe: "status--info" },
  aguardando: { texto: "Aguardando motorista", classe: "status--alerta" },
  concluida: { texto: "Concluída", classe: "status--ok" },
  cancelada: { texto: "Cancelada", classe: "status--erro" },
};

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "sem-motorista", rotulo: "Sem motorista" },
];

const DESTINOS = [...new Set(VIAGENS.map((v) => v.destino))];
const MOTIVOS = [...new Set(VIAGENS.map((v) => v.motivo))];

const dois = (n: number) => String(n).padStart(2, "0");

function dataDaViagem(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}

function dataISO(offset: number): string {
  const d = dataDaViagem(offset);
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function rotuloSaida(v: Viagem): string {
  if (v.offset === 0) return `Hoje, ${v.hora}`;
  if (v.offset === 1) return `Amanhã, ${v.hora}`;
  const d = dataDaViagem(v.offset);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}, ${v.hora}`;
}

export default function Viagens({ iniciarCriando = false, onNavegar, onSair }: ViagensProps) {
  const [criando, setCriando] = useState(iniciarCriando);
  const [salvo, setSalvo] = useState(false);
  const [aba, setAba] = useState<Aba>("todas");
  const [busca, setBusca] = useState("");
  const [destino, setDestino] = useState("");
  const [motivo, setMotivo] = useState("");
  const [data, setData] = useState("");

  const termo = busca.trim().toLowerCase();
  const visiveis = VIAGENS.filter((v) => {
    if (aba === "hoje" && v.offset !== 0) return false;
    if (aba === "sem-motorista" && v.motorista !== null) return false;
    if (destino && v.destino !== destino) return false;
    if (motivo && v.motivo !== motivo) return false;
    if (data && dataISO(v.offset) !== data) return false;
    if (termo) {
      const texto = `${v.id} ${v.destino} ${v.unidade} ${v.motorista ?? ""}`.toLowerCase();
      if (!texto.includes(termo)) return false;
    }
    return true;
  });

  function aoConcluirFormulario(salvou: boolean) {
    setCriando(false);
    setSalvo(salvou);
  }

  // Clicar em "Viagens" no menu também volta para a lista.
  function navegar(item: string) {
    if (item === "Viagens") {
      setCriando(false);
      setSalvo(false);
    }
    onNavegar(item);
  }

  return (
    <AppLayout ativo="Viagens" onNavegar={navegar} onSair={onSair}>
      {criando ? (
        <FormularioViagem onConcluir={aoConcluirFormulario} />
      ) : (
        <>
          <header className="cabecalho cabecalho--linha">
            <div>
              <h1>Viagens</h1>
              <p>Todas as viagens programadas e realizadas</p>
            </div>
            <div className="cabecalho__acoes">
              <button
                type="button"
                className="botao botao--primario"
                onClick={() => {
                  setSalvo(false);
                  setCriando(true);
                }}
              >
                Nova viagem
              </button>
            </div>
          </header>

          {salvo && (
            <div className="aviso aviso--ok" role="status">
              Viagem cadastrada com sucesso.
            </div>
          )}

          <div className="abas" role="group" aria-label="Filtrar por grupo">
            {ABAS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={a.id === aba ? "aba aba--ativa" : "aba"}
                aria-pressed={a.id === aba}
                onClick={() => setAba(a.id)}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="filtros">
            <input
              type="search"
              className="filtro"
              aria-label="Buscar por destino ou paciente"
              placeholder="Buscar por destino ou paciente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select className="filtro" aria-label="Destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">Todos os destinos</option>
              {DESTINOS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select className="filtro" aria-label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              <option value="">Todos os motivos</option>
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="date"
              className="filtro"
              aria-label="Data da viagem"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <section className="cartao">
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Saída</th>
                    <th>Destino</th>
                    <th>Motivo</th>
                    <th>Veículo e motorista</th>
                    <th>Pass.</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.id}</strong></td>
                      <td>{rotuloSaida(v)}</td>
                      <td>
                        {v.destino}
                        <small className="tabela__sub">{v.unidade}</small>
                      </td>
                      <td>{v.motivo}</td>
                      <td>
                        {v.veiculo ?? "—"}
                        <small className="tabela__sub">{v.motorista ?? "—"}</small>
                      </td>
                      <td>{v.passageiros}</td>
                      <td>
                        <span className={`status ${SITUACOES[v.situacao].classe}`}>
                          {SITUACOES[v.situacao].texto}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visiveis.length === 0 && (
              <p className="texto-suave" style={{ margin: "16px 10px 4px" }}>
                Nenhuma viagem encontrada com esses filtros.
              </p>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
