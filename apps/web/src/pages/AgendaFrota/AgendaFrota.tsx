import "./AgendaFrota.css";
import { useState } from "react";
import AppLayout from "../../components/AppLayout";
import Selecao from "../../components/Selecao";

interface AgendaFrotaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type Situacao = "agendada" | "andamento" | "concluida" | "conflito" | "manutencao";

interface Evento {
  id: string;
  veiculo: string;
  /** 0 = semana atual, -1 = anterior, 1 = próxima */
  semana: number;
  /** 0 = segunda ... 5 = sábado */
  dia: number;
  hora: string;
  destino: string;
  unidade: string;
  motorista: string;
  passageiros: number;
  situacao: Situacao;
}

// Dados de exemplo: no sistema real virão do backend.
const FROTA = [
  { id: "VAN-01", tipo: "Van" },
  { id: "VAN-02", tipo: "Van" },
  { id: "MIC-01", tipo: "Micro-ônibus" },
  { id: "CAR-03", tipo: "Carro adaptado" },
  { id: "AMB-01", tipo: "Ambulância" },
];

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ROTULOS: Record<Situacao, string> = {
  agendada: "Agendada",
  andamento: "Em andamento",
  concluida: "Concluída",
  conflito: "Conflito de horário",
  manutencao: "Em manutenção",
};

const EVENTOS: Evento[] = [
  { id: "e1", veiculo: "VAN-01", semana: 0, dia: 1, hora: "05:30", destino: "Campinas", unidade: "Hospital de Clínicas", motorista: "Ana Paula Reis", passageiros: 7, situacao: "agendada" },
  { id: "e2", veiculo: "VAN-01", semana: 0, dia: 3, hora: "13:00", destino: "Belo Horizonte", unidade: "Hospital das Clínicas", motorista: "Ana Paula Reis", passageiros: 6, situacao: "agendada" },
  { id: "e3", veiculo: "VAN-02", semana: 0, dia: 2, hora: "05:30", destino: "Campinas", unidade: "Hospital de Clínicas", motorista: "Carlos Mendes", passageiros: 8, situacao: "andamento" },
  { id: "e4", veiculo: "VAN-02", semana: 0, dia: 4, hora: "05:00", destino: "São Paulo", unidade: "Hospital do Câncer", motorista: "Carlos Mendes", passageiros: 5, situacao: "conflito" },
  { id: "e5", veiculo: "VAN-02", semana: 0, dia: 4, hora: "06:00", destino: "Itajubá", unidade: "Santa Casa", motorista: "Marcos Teixeira", passageiros: 9, situacao: "conflito" },
  { id: "e6", veiculo: "MIC-01", semana: 0, dia: 0, hora: "07:00", destino: "Varginha", unidade: "Hospital Bom Samaritano", motorista: "Rogério Alves", passageiros: 12, situacao: "concluida" },
  { id: "e7", veiculo: "MIC-01", semana: 0, dia: 3, hora: "06:00", destino: "Varginha", unidade: "Hospital Bom Samaritano", motorista: "Rogério Alves", passageiros: 14, situacao: "agendada" },
  { id: "e8", veiculo: "CAR-03", semana: 0, dia: 2, hora: "08:00", destino: "Itajubá", unidade: "Santa Casa", motorista: "Marcos Teixeira", passageiros: 3, situacao: "agendada" },
  ...[0, 1, 2, 3].map<Evento>((dia) => ({
    id: `m${dia}`, veiculo: "AMB-01", semana: 0, dia, hora: "", destino: "Manutenção", unidade: "Oficina municipal", motorista: "—", passageiros: 0, situacao: "manutencao",
  })),
  { id: "p1", veiculo: "VAN-01", semana: -1, dia: 2, hora: "05:30", destino: "Campinas", unidade: "Hospital de Clínicas", motorista: "Ana Paula Reis", passageiros: 7, situacao: "concluida" },
  { id: "p2", veiculo: "MIC-01", semana: -1, dia: 4, hora: "06:00", destino: "Varginha", unidade: "Hospital Bom Samaritano", motorista: "Rogério Alves", passageiros: 13, situacao: "concluida" },
  { id: "n1", veiculo: "VAN-01", semana: 1, dia: 0, hora: "05:30", destino: "Belo Horizonte", unidade: "Hospital das Clínicas", motorista: "Ana Paula Reis", passageiros: 6, situacao: "agendada" },
  { id: "n2", veiculo: "MIC-01", semana: 1, dia: 1, hora: "06:00", destino: "Varginha", unidade: "Hospital Bom Samaritano", motorista: "Rogério Alves", passageiros: 11, situacao: "agendada" },
  { id: "n3", veiculo: "VAN-02", semana: 1, dia: 2, hora: "05:00", destino: "São Paulo", unidade: "Hospital do Câncer", motorista: "Carlos Mendes", passageiros: 5, situacao: "agendada" },
];

function segundaDaSemana(referencia: Date, deslocamentoSemanas: number): Date {
  const diff = (referencia.getDay() + 6) % 7;
  return new Date(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate() - diff + deslocamentoSemanas * 7
  );
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function tituloSemana(inicio: Date): string {
  const fim = somarDias(inicio, 5);
  const mes = (d: Date) => d.toLocaleDateString("pt-BR", { month: "long" });
  return inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()} a ${fim.getDate()} de ${mes(fim)} de ${fim.getFullYear()}`
    : `${inicio.getDate()} de ${mes(inicio)} a ${fim.getDate()} de ${mes(fim)} de ${fim.getFullYear()}`;
}

export default function AgendaFrota({ onNavegar, onSair }: AgendaFrotaProps) {
  const [semana, setSemana] = useState(0);
  const [veiculo, setVeiculo] = useState("Todos");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const hoje = new Date();
  const inicio = segundaDaSemana(hoje, semana);
  const datas = DIAS.map((_, i) => somarDias(inicio, i));
  const linhas = FROTA.filter((v) => veiculo === "Todos" || v.id === veiculo);
  const evento = EVENTOS.find((e) => e.id === selecionado);

  function mudarSemana(novaSemana: number) {
    setSemana(novaSemana);
    setSelecionado(null);
  }

  return (
    <AppLayout ativo="Agenda da frota" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>Agenda da frota</h1>
        <p>Veja a ocupação dos veículos e evite conflitos de horário.</p>
      </header>

      <div className="filtros filtros--agenda">
        <div className="navegacao-semana">
          <button type="button" className="botao botao--secundario" onClick={() => mudarSemana(semana - 1)}>
            ‹ Anterior
          </button>
          <button type="button" className="botao botao--secundario" onClick={() => mudarSemana(0)} disabled={semana === 0}>
            Hoje
          </button>
          <button type="button" className="botao botao--secundario" onClick={() => mudarSemana(semana + 1)}>
            Próxima ›
          </button>
          <strong className="navegacao-semana__titulo" aria-live="polite">{tituloSemana(inicio)}</strong>
        </div>
        <Selecao
          id="filtro-veiculo"
          rotulo="Veículo"
          opcoes={["Todos", ...FROTA.map((v) => v.id)]}
          value={veiculo}
          onChange={(e) => setVeiculo(e.target.value)}
        />
      </div>

      <section className="cartao">
        <div className="tabela-rolagem">
          <table className="agenda">
            <thead>
              <tr>
                <th scope="col" className="agenda__canto">Veículo</th>
                {datas.map((d, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={mesmoDia(d, hoje) ? "agenda__dia agenda__dia--hoje" : "agenda__dia"}
                  >
                    {DIAS[i]} {String(d.getDate()).padStart(2, "0")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((v) => (
                <tr key={v.id}>
                  <th scope="row" className="agenda__veiculo">
                    {v.id}
                    <small>{v.tipo}</small>
                  </th>
                  {datas.map((d, i) => (
                    <td key={i} className={mesmoDia(d, hoje) ? "agenda__celula agenda__celula--hoje" : "agenda__celula"}>
                      {EVENTOS.filter((e) => e.veiculo === v.id && e.semana === semana && e.dia === i).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          className={`evento evento--${e.situacao}${e.id === selecionado ? " evento--ativo" : ""}`}
                          aria-pressed={e.id === selecionado}
                          onClick={() => setSelecionado(e.id === selecionado ? null : e.id)}
                        >
                          {e.hora && <b>{e.hora}</b>} {e.destino}
                        </button>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="legenda" aria-label="Legenda">
          {(Object.keys(ROTULOS) as Situacao[]).map((s) => (
            <li key={s}>
              <span className={`legenda__cor evento--${s}`} aria-hidden="true" />
              {ROTULOS[s]}
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao" style={{ marginTop: 16 }} aria-live="polite">
        {evento ? (
          <>
            <h2 className="cartao__titulo">
              {evento.destino} · {evento.veiculo}
            </h2>
            <dl className="detalhes">
              <div><dt>Situação</dt><dd>{ROTULOS[evento.situacao]}</dd></div>
              {evento.hora && <div><dt>Saída</dt><dd>{evento.hora}</dd></div>}
              <div><dt>Local</dt><dd>{evento.unidade}</dd></div>
              <div><dt>Motorista</dt><dd>{evento.motorista}</dd></div>
              {evento.situacao !== "manutencao" && <div><dt>Passageiros</dt><dd>{evento.passageiros}</dd></div>}
            </dl>
            {evento.situacao === "conflito" && (
              <div className="aviso aviso--alerta" role="alert">
                Este veículo tem duas viagens em horários próximos neste dia. Troque o veículo de uma delas.
              </div>
            )}
          </>
        ) : (
          <p className="texto-suave" style={{ margin: 0 }}>
            Clique em uma viagem da agenda para ver os detalhes.
          </p>
        )}
      </section>
    </AppLayout>
  );
}

