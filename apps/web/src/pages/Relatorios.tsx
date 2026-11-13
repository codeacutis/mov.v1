import { useState } from "react";
import AppLayout from "../components/AppLayout";
import Selecao from "../components/Selecao";

interface RelatoriosProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface Indicador {
  rotulo: string;
  valor: string;
  detalhe: string;
}

interface Contagem {
  nome: string;
  total: number;
}

interface UsoVeiculo {
  veiculo: string;
  viagens: number;
  km: string;
  ocupacao: string;
}

// Dados de exemplo: no sistema real virão do backend.
const PERIODOS = ["Outubro de 2026", "Setembro de 2026", "Últimos 3 meses"];

const INDICADORES: Indicador[] = [
  { rotulo: "Viagens realizadas", valor: "186", detalhe: "8 canceladas" },
  { rotulo: "Pacientes transportados", valor: "214", detalhe: "+12% em relação a setembro" },
  { rotulo: "Ocupação média", valor: "78%", detalhe: "dos lugares dos veículos" },
  { rotulo: "Km rodados", valor: "12.480", detalhe: "média de 67 km por viagem" },
];

const POR_DESTINO: Contagem[] = [
  { nome: "Campinas", total: 62 },
  { nome: "Varginha", total: 48 },
  { nome: "Belo Horizonte", total: 37 },
  { nome: "São Paulo", total: 22 },
  { nome: "Itajubá", total: 17 },
];

const POR_MOTIVO: Contagem[] = [
  { nome: "Consulta", total: 84 },
  { nome: "Exame", total: 52 },
  { nome: "Procedimento", total: 31 },
  { nome: "Tratamento contínuo", total: 19 },
];

const USO_VEICULOS: UsoVeiculo[] = [
  { veiculo: "MIC-01", viagens: 58, km: "4.120", ocupacao: "85%" },
  { veiculo: "VAN-02", viagens: 51, km: "3.640", ocupacao: "74%" },
  { veiculo: "VAN-01", viagens: 44, km: "3.015", ocupacao: "82%" },
  { veiculo: "CAR-03", viagens: 33, km: "1.705", ocupacao: "71%" },
];

function Barras({ dados }: { dados: Contagem[] }) {
  const maior = Math.max(...dados.map((d) => d.total));
  return (
    <ul className="barras">
      {dados.map((d) => (
        <li key={d.nome}>
          <div className="barras__texto">
            <span>{d.nome}</span>
            <strong>{d.total}</strong>
          </div>
          <div className="medidor">
            <i style={{ width: `${(d.total / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Relatorios({ onNavegar, onSair }: RelatoriosProps) {
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [veiculo, setVeiculo] = useState("Todos");

  const linhas = USO_VEICULOS.filter((v) => veiculo === "Todos" || v.veiculo === veiculo);

  // Botões de exportação apenas visuais, sem função por enquanto.
  return (
    <AppLayout ativo="Relatórios" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Relatórios</h1>
          <p>Indicadores de uso da frota e do transporte de pacientes.</p>
        </div>
        <div className="cabecalho__acoes">
          <button type="button" className="botao botao--secundario">
            Exportar PDF
          </button>
          <button type="button" className="botao botao--secundario">
            Exportar planilha
          </button>
        </div>
      </header>

      <div className="filtros">
        <Selecao
          id="periodo"
          rotulo="Período"
          opcoes={PERIODOS}
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        />
        <Selecao
          id="filtro-veiculo"
          rotulo="Veículo"
          opcoes={["Todos", ...USO_VEICULOS.map((v) => v.veiculo)]}
          value={veiculo}
          onChange={(e) => setVeiculo(e.target.value)}
        />
      </div>

      <section className="indicadores" aria-label={`Resumo de ${periodo}`}>
        {INDICADORES.map((i) => (
          <div className="cartao indicador" key={i.rotulo}>
            <span>{i.rotulo}</span>
            <strong>{i.valor}</strong>
            <small>{i.detalhe}</small>
          </div>
        ))}
      </section>

      <div className="duas-colunas duas-colunas--iguais">
        <section className="cartao">
          <h2 className="cartao__titulo">Viagens por destino</h2>
          <Barras dados={POR_DESTINO} />
        </section>
        <section className="cartao">
          <h2 className="cartao__titulo">Viagens por motivo</h2>
          <Barras dados={POR_MOTIVO} />
        </section>
      </div>

      <section className="cartao" style={{ marginTop: 16 }}>
        <h2 className="cartao__titulo">Uso por veículo</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Viagens</th>
                <th>Km rodados</th>
                <th>Ocupação média</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((v) => (
                <tr key={v.veiculo}>
                  <td>
                    <strong>{v.veiculo}</strong>
                  </td>
                  <td>{v.viagens}</td>
                  <td>{v.km}</td>
                  <td>{v.ocupacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
