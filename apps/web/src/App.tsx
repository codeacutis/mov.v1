import { useState } from "react";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import Painel from "./pages/Painel";
import Viagens from "./pages/Viagens/Viagens";
import AgendaFrota from "./pages/AgendaFrota/AgendaFrota";
import CadastroVeiculo from "./pages/CadastroVeiculo/CadastroVeiculo";
import CadastroMotorista from "./pages/CadastroMotorista/CadastroMotorista";
import CadastroPassageiro from "./pages/CadastroPassageiro/CadastroPassageiro";
import Relatorios from "./pages/Relatorios/Relatorios";
import AppMotorista from "./pages/AppMotorista/AppMotorista";

type Tela =
  | "login"
  | "recuperar"
  | "painel"
  | "viagem"
  | "agenda"
  | "veiculo"
  | "motorista"
  | "passageiro"
  | "relatorios"
  | "appMotorista";

// Item do menu lateral -> tela. Itens sem tela ainda não fazem nada.
const TELAS_DO_MENU: Record<string, Tela> = {
  Painel: "painel",
  Viagens: "viagem",
  "Agenda da frota": "agenda",
  Veículos: "veiculo",
  Motoristas: "motorista",
  Passageiros: "passageiro",
  Relatórios: "relatorios",
  "App do motorista": "appMotorista",
};

export default function App() {
  const [tela, setTela] = useState<Tela>("login");
  // Quando true, a tela de viagens abre direto no formulário de nova viagem.
  const [abrirNovaViagem, setAbrirNovaViagem] = useState(false);

  function navegar(item: string) {
    if (item === "Nova viagem") {
      setAbrirNovaViagem(true);
      setTela("viagem");
      return;
    }
    setAbrirNovaViagem(false);
    const destino = TELAS_DO_MENU[item];
    if (destino) setTela(destino);
  }

  const interna = { onNavegar: navegar, onSair: () => setTela("login") };

  switch (tela) {
    case "recuperar":
      return <RecuperarSenha onVoltar={() => setTela("login")} />;
    case "painel":
      return <Painel {...interna} />;
    case "viagem":
      return (
        <Viagens
          key={abrirNovaViagem ? "nova" : "lista"}
          iniciarCriando={abrirNovaViagem}
          {...interna}
        />
      );
    case "agenda":
      return <AgendaFrota {...interna} />;
    case "veiculo":
      return <CadastroVeiculo {...interna} />;
    case "motorista":
      return <CadastroMotorista {...interna} />;
    case "passageiro":
      return <CadastroPassageiro {...interna} />;
    case "relatorios":
      return <Relatorios {...interna} />;
    case "appMotorista":
      return <AppMotorista {...interna} />;
    default:
      return (
        <Login
          onEntrar={() => setTela("painel")}
          onEsqueciSenha={() => setTela("recuperar")}
        />
      );
  }
}
