import { useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "../services/api";
import Icon from "./Icon";
const ITEMS = [
  "Painel",
  "Viagens",
  "Agenda da frota",
  "Veículos",
  "Motoristas",
  "Passageiros",
  "Relatórios",
];
interface AppLayoutProps {
  ativo: string;
  onNavegar: (item: string) => void;
  onSair: () => void;
  larguraTotal?: boolean;
  children: ReactNode;
}
export default function AppLayout({
  ativo,
  onNavegar,
  onSair,
  larguraTotal = false,
  children,
}: AppLayoutProps) {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ name: string; role: string }>("/auth/me", {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setUser(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="app">
      <aside className="menu">
        <div className="logo">
          <span className="logo__icone">+</span>Mov+
        </div>
        <p className="menu__submarca">Transporte municipal</p>
        <nav aria-label="Principal">
          {ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              className={`menu__item${item === ativo ? " menu__item--ativo" : ""}`}
              aria-current={item === ativo ? "page" : undefined}
              onClick={() => onNavegar(item)}
            >
              <Icon name={item} />
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <footer className="menu__usuario">
          <span className="menu__avatar" aria-hidden="true">
            {user?.name?.slice(0, 1).toUpperCase() ?? "•"}
          </span>
          <div>
            <strong>
              {user?.name ??
                (failed ? "Usuário indisponível" : "Carregando usuário…")}
            </strong>
            <small>
              {user
                ? user.role === "ADMIN"
                  ? "Administrador"
                  : "Motorista"
                : "Sessão atual"}
            </small>
          </div>
          <button
            type="button"
            className="menu__sair"
            onClick={onSair}
            aria-label="Sair"
            title="Sair"
          >
            <Icon name="Sair" />
          </button>
        </footer>
      </aside>
      <main
        className={
          larguraTotal ? "app__conteudo app__conteudo--total" : "app__conteudo"
        }
      >
        {children}
      </main>
    </div>
  );
}
