import { useState, type FormEvent } from "react";
import AppLayout from "../components/AppLayout";
import Campo from "../components/Campo";
import Selecao from "../components/Selecao";
import { mascaraKm } from "../utils/mascaras";

interface AppMotoristaProps {
  onNavegar: (item: string) => void;
  onSair: () => void;
}

interface Passageiro {
  id: number;
  nome: string;
}

// Dados de exemplo: no sistema real virão da viagem atribuída ao motorista.
const PASSAGEIROS: Passageiro[] = [
  { id: 1, nome: "Maria das Graças Silva" },
  { id: 2, nome: "José Antônio Pereira" },
  { id: 3, nome: "Luzia Ferreira Costa" },
  { id: 4, nome: "Pedro Henrique Lima" },
  { id: 5, nome: "Aparecida Rocha" },
  { id: 6, nome: "Antônio Carlos Souza" },
  { id: 7, nome: "Francisca Nunes" },
  { id: 8, nome: "Joaquim Barbosa" },
];

const TIPOS_OCORRENCIA = [
  "Problema mecânico",
  "Atraso no trânsito",
  "Passageiro passou mal",
  "Acidente",
  "Outro",
];

export default function AppMotorista({ onNavegar, onSair }: AppMotoristaProps) {
  const [embarcados, setEmbarcados] = useState<number[]>([1, 2, 3]);
  const [km, setKm] = useState("71.904");
  const [chegou, setChegou] = useState(false);
  const [ocorrenciaAberta, setOcorrenciaAberta] = useState(false);
  const [tipoOcorrencia, setTipoOcorrencia] = useState(TIPOS_OCORRENCIA[0]);
  const [descricao, setDescricao] = useState("");
  const [enviada, setEnviada] = useState(false);

  function alternarEmbarque(id: number) {
    setEmbarcados((atual) =>
      atual.includes(id) ? atual.filter((p) => p !== id) : [...atual, id]
    );
  }

  // Tela apenas visual: nada é enviado, só muda o estado da tela.
  function enviarOcorrencia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOcorrenciaAberta(false);
    setDescricao("");
    setTipoOcorrencia(TIPOS_OCORRENCIA[0]);
    setEnviada(true);
  }

  return (
    <AppLayout ativo="App do motorista" onNavegar={onNavegar} onSair={onSair} larguraTotal>
      <header className="cabecalho">
        <h1>App do motorista</h1>
        <p>Tela de celular usada pelo motorista durante a viagem.</p>
      </header>

      <div className="celular">
        <h2 className="celular__titulo">Olá, Carlos</h2>
        <p className="texto-suave">Viagem de hoje</p>

        <section className="cartao" aria-label="Viagem de hoje">
          <strong>Campinas · 05:30</strong>
          <p className="texto-suave" style={{ margin: "2px 0 10px" }}>
            VAN-02 · Hospital de Clínicas
          </p>
          <span className={chegou ? "status status--info" : "status status--ok"}>
            {chegou ? "Chegou ao destino" : "Em andamento"}
          </span>
        </section>

        <section className="cartao" aria-label="Embarque">
          <h3 className="cartao__subtitulo">
            Embarque ({embarcados.length} de {PASSAGEIROS.length})
          </h3>
          <ul className="lista-passageiros">
            {PASSAGEIROS.map((p) => (
              <li key={p.id}>
                <label className="check passageiro">
                  <input
                    type="checkbox"
                    checked={embarcados.includes(p.id)}
                    onChange={() => alternarEmbarque(p.id)}
                  />
                  {p.nome}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao" aria-label="Quilometragem">
          <Campo
            id="km-atual"
            rotulo="Km atual"
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(mascaraKm(e.target.value))}
          />
        </section>

        {chegou && (
          <div className="aviso aviso--ok" role="status">
            Chegada registrada com sucesso.
          </div>
        )}
        {enviada && (
          <div className="aviso aviso--ok" role="status">
            Ocorrência enviada para o setor de transporte.
          </div>
        )}

        <button
          type="button"
          className="botao botao--primario"
          disabled={chegou}
          onClick={() => setChegou(true)}
        >
          {chegou ? "Chegada registrada" : "Registrar chegada ao destino"}
        </button>

        {ocorrenciaAberta ? (
          <form className="cartao" style={{ marginTop: 10 }} onSubmit={enviarOcorrencia}>
            <h3 className="cartao__subtitulo">Informar ocorrência</h3>
            <Selecao
              id="tipo-ocorrencia"
              rotulo="Tipo"
              opcoes={TIPOS_OCORRENCIA}
              value={tipoOcorrencia}
              onChange={(e) => setTipoOcorrencia(e.target.value)}
            />
            <div className="campo">
              <label htmlFor="descricao-ocorrencia">Descrição</label>
              <textarea
                id="descricao-ocorrencia"
                rows={3}
                placeholder="Conte o que aconteceu"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>
            <div className="acoes acoes--coluna">
              <button type="submit" className="botao botao--primario">
                Enviar ocorrência
              </button>
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => setOcorrenciaAberta(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="botao botao--secundario"
            style={{ marginTop: 10 }}
            onClick={() => {
              setEnviada(false);
              setOcorrenciaAberta(true);
            }}
          >
            Informar ocorrência
          </button>
        )}
      </div>
    </AppLayout>
  );
}
