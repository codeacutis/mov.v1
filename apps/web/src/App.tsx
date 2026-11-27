import { useEffect, useState } from "react";
import {
  apiRequest,
  clearAccessToken,
  getAccessToken,
  getSessionUser,
  apiErrorMessage,
  ApiRequestError,
  SESSION_EXPIRED_EVENT,
  type SessionUser,
} from "./services/api";
import Login from "./pages/Login/Login";
import RecuperarSenha from "./pages/RecuperarSenha/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha/RedefinirSenha";
import Painel from "./pages/Painel/Painel";
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
  | "redefinir"
  | "painel"
  | "viagem"
  | "agenda"
  | "veiculo"
  | "motorista"
  | "passageiro"
  | "relatorios";

// Item do menu lateral -> tela. Itens sem tela ainda não fazem nada.
const TELAS_DO_MENU: Record<string, Tela> = {
  Painel: "painel",
  Viagens: "viagem",
  "Agenda da frota": "agenda",
  Veículos: "veiculo",
  Motoristas: "motorista",
  Passageiros: "passageiro",
  Relatórios: "relatorios",
};

const ROTA_REDEFINIR = "/redefinir-senha";

/**
 * Link do e-mail: /redefinir-senha?token=... . O token é lido uma única vez e
 * removido da barra de endereço, para não ficar no histórico nem vazar por Referer.
 */
function lerTokenDeRedefinicao(): string | null {
  if (window.location.pathname !== ROTA_REDEFINIR) return null;
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  window.history.replaceState(null, "", "/");
  return token;
}

// Lido uma única vez ao carregar a página (um useState seria executado duas
// vezes no StrictMode, e a segunda leitura já não encontraria o token).
const TOKEN_REDEFINICAO = lerTokenDeRedefinicao();

export default function App() {
  const tokenRedefinicao = TOKEN_REDEFINICAO;
  const [tela, setTela] = useState<Tela>(
    tokenRedefinicao === null ? "login" : "redefinir",
  );
  // Quando true, a tela de viagens abre direto no formulário de nova viagem.
  const [abrirNovaViagem, setAbrirNovaViagem] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [retrySession, setRetrySession] = useState(0);

  useEffect(() => {
    let controller = new AbortController();
    async function restore() {
      controller.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const token = getAccessToken();
      setChecking(true);
      setUser(null);
      setSessionError("");
      try {
        if (!token || tokenRedefinicao !== null) return;
        const identity = await getSessionUser(signal);
        if (!signal.aborted && token === getAccessToken()) {
          setUser(identity);
          setTela("painel");
        }
      } catch (error) {
        if (signal.aborted || token !== getAccessToken()) return;
        if (
          error instanceof ApiRequestError &&
          [401, 403].includes(error.status)
        )
          clearAccessToken();
        else setSessionError(apiErrorMessage(error));
      } finally {
        if (!signal.aborted) setChecking(false);
      }
    }
    function expired() {
      controller.abort();
      setUser(null);
      setTela("login");
      setSessionError("");
      setChecking(false);
    }
    function storage(event: StorageEvent) {
      if (event.key === "mov.accessToken" || event.key === null) void restore();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    window.addEventListener("storage", storage);
    void restore();
    return () => {
      controller.abort();
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
      window.removeEventListener("storage", storage);
    };
  }, [retrySession, tokenRedefinicao]);

  function navegar(item: string) {
    if (user?.role !== "ADMIN") return;
    if (item === "Nova viagem") {
      setAbrirNovaViagem(true);
      setTela("viagem");
      return;
    }
    setAbrirNovaViagem(false);
    const destino = TELAS_DO_MENU[item];
    if (destino) setTela(destino);
  }

  async function sair() {
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
    } catch {
      // A sessão local é removida mesmo quando a API não responde.
    } finally {
      clearAccessToken();
      setUser(null);
      setSessionError("");
      setChecking(false);
      setTela("login");
    }
  }
  const interna = { onNavegar: navegar, onSair: sair };

  if (tela !== "redefinir" && tela !== "recuperar") {
    if (checking)
      return (
        <main className="formulario" role="status">
          Verificando sessão…
        </main>
      );
    if (sessionError)
      return (
        <main className="formulario">
          <p role="alert">{sessionError}</p>
          <button
            className="botao"
            onClick={() => setRetrySession((value) => value + 1)}
          >
            Tentar novamente
          </button>
          <button className="botao" onClick={() => void sair()}>
            Sair
          </button>
        </main>
      );
    if (!user)
      return (
        <Login
          onEntrar={(identity) => {
            setUser(identity);
            setTela("painel");
          }}
          onEsqueciSenha={() => setTela("recuperar")}
        />
      );
    if (user.role === "MOTORISTA")
      return <AppMotorista onSair={sair} userName={user.name} />;
  }

  switch (tela) {
    case "redefinir":
      return (
        <RedefinirSenha
          token={tokenRedefinicao ?? ""}
          onVoltar={() => setTela("login")}
          onSolicitarNovo={() => setTela("recuperar")}
        />
      );
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
    default:
      return <Painel {...interna} />;
  }
}
