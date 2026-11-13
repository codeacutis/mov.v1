import AppLayout from "../components/AppLayout";

interface PainelProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

type Tom = "ok" | "info" | "alerta";

// Dados de exemplo: no sistema real virão do backend.
const INDICADORES = [
  { rotulo: "Viagens hoje", valor: "3", detalhe: "2 em andamento" },
  { rotulo: "Veículos disponíveis", valor: "2 de 5", detalhe: "1 em manutenção" },
  { rotulo: "Pacientes transportados no mês", valor: "214", detalhe: "+12% em relação ao mês anterior" },
  { rotulo: "Km rodados no mês", valor: "12.480", detalhe: "média de 67 km por viagem" },
];

const VIAGENS_HOJE: {
  hora: string; destino: string; motivo: string; veiculo: string; motorista: string;
  passageiros: number; situacao: string; tom: Tom;
}[] = [
  { hora: "05:30", destino: "Campinas", motivo: "Consulta", veiculo: "VAN-02", motorista: "Carlos Mendes", passageiros: 8, situacao: "Em andamento", tom: "ok" },
  { hora: "06:00", destino: "Varginha", motivo: "Exame", veiculo: "MIC-01", motorista: "Rogério Alves", passageiros: 14, situacao: "Em andamento", tom: "ok" },
  { hora: "13:00", destino: "Belo Horizonte", motivo: "Procedimento", veiculo: "VAN-01", motorista: "Ana Paula Reis", passageiros: 6, situacao: "Agendada", tom: "info" },
];

const ALERTAS = [
  { classe: "aviso--erro", texto: "Viagem V-0245 está sem veículo e motorista." },
  { classe: "aviso--alerta", texto: "A revisão da ambulância AMB-01 venceu." },
  { classe: "aviso--alerta", texto: "A CNH de Rogério Alves vence em breve." },
  { classe: "aviso--info", texto: "9 pacientes aguardam transporte para amanhã." },
];

const VIAGENS_SEMANA = [
  { dia: "Seg", total: 9 },
  { dia: "Ter", total: 12 },
  { dia: "Qua", total: 8 },
  { dia: "Qui", total: 14 },
  { dia: "Sex", total: 11 },
  { dia: "Sáb", total: 3 },
];

const FROTA: { id: string; lugares: number; situacao: string; tom: Tom }[] = [
  { id: "VAN-01", lugares: 15, situacao: "Disponível", tom: "ok" },
  { id: "VAN-02", lugares: 12, situacao: "Em viagem", tom: "info" },
  { id: "MIC-01", lugares: 28, situacao: "Em viagem", tom: "info" },
  { id: "CAR-03", lugares: 5, situacao: "Disponível", tom: "ok" },
  { id: "AMB-01", lugares: 3, situacao: "Em manutenção", tom: "alerta" },
];

function saudacao(agora: Date): string {
  const h = agora.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Painel({ onNavegar, onSair }: PainelProps) {
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const dataFormatada = data.charAt(0).toUpperCase() + data.slice(1);
  const maior = Math.max(...VIAGENS_SEMANA.map((d) => d.total));

  return (
    <AppLayout ativo="Painel" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho">
        <h1>{saudacao(agora)}</h1>
        <p>{dataFormatada} · Setor de Transporte</p>
      </header>

      <section className="indicadores" aria-label="Resumo">
        {INDICADORES.map((i) => (
          <div className="cartao indicador" key={i.rotulo}>
            <span>{i.rotulo}</span>
            <strong>{i.valor}</strong>
            <small>{i.detalhe}</small>
          </div>
        ))}
      </section>

      <div className="duas-colunas">
        <section className="cartao">
          <div className="cartao__cabecalho">
            <h2 className="cartao__titulo">Viagens de hoje</h2>
            <button type="button" className="link" onClick={() => onNavegar("Viagens")}>
              Ver todas
            </button>
          </div>
          <ul className="lista-hoje">
            {VIAGENS_HOJE.map((v) => (
              <li key={v.hora}>
                <time>{v.hora}</time>
                <div>
                  <strong>{v.destino}</strong> · {v.motivo}
                  <small className="tabela__sub">
                    {v.veiculo} · {v.motorista} · {v.passageiros} passageiros
                  </small>
                </div>
                <span className={`status status--${v.tom}`}>{v.situacao}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao">
          <h2 className="cartao__titulo">Precisa de atenção</h2>
          {ALERTAS.map((a) => (
            <div className={`aviso ${a.classe}`} key={a.texto}>
              {a.texto}
            </div>
          ))}
        </section>
      </div>

      <div className="duas-colunas" style={{ marginTop: 16 }}>
        <section className="cartao">
          <h2 className="cartao__titulo">Viagens por dia nesta semana</h2>
          <div className="grafico">
            {VIAGENS_SEMANA.map((d) => (
              <div className="grafico__coluna" key={d.dia}>
                <div className="grafico__area">
                  <div className="grafico__barra" style={{ height: `${(d.total / maior) * 100}%` }} />
                </div>
                <span>{d.dia}</span>
                <strong>{d.total}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="cartao">
          <h2 className="cartao__titulo">Frota agora</h2>
          <ul className="lista-frota">
            {FROTA.map((v) => (
              <li key={v.id}>
                <strong>{v.id}</strong>
                <span className={`status status--${v.tom}`}>{v.situacao}</span>
                <span className="texto-suave">{v.lugares} lugares</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppLayout>
  );
}
