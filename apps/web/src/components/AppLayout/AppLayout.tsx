import type { ReactNode } from "react";
import "./AppLayout.css";

const GRUPOS = [
  { titulo: "Operação", itens: ["Painel", "Viagens", "Agenda da frota"] },
  { titulo: "Cadastros", itens: ["Veículos", "Motoristas", "Passageiros"] },
  { titulo: "Gestão", itens: ["Relatórios", "App do motorista"] },
];

interface AppLayoutProps {
  ativo: string;
  onNavegar: (item: string) => void;
  onSair: () => void;
  larguraTotal?: boolean;
  children: ReactNode;
}

export default function AppLayout({ ativo, onNavegar, onSair, larguraTotal = false, children }: AppLayoutProps) {
  return (
    <div className="app">
      <aside className="menu">
        <div className="logo">
          <span className="logo__icone">+</span>
          Mov+
        </div>
        <nav aria-label="Principal">
          {GRUPOS.map((grupo) => (
            <div className="menu__grupo" role="group" aria-label={grupo.titulo} key={grupo.titulo}>
              <p className="menu__titulo">{grupo.titulo}</p>
              {grupo.itens.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === ativo ? "menu__item menu__item--ativo" : "menu__item"}
                  aria-current={item === ativo ? "page" : undefined}
                  onClick={() => onNavegar(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
          <div className="menu__grupo" role="group" aria-label="Conta">
            <p className="menu__titulo">Conta</p>
            <button type="button" className="menu__item" onClick={onSair}>
              Sair
            </button>
          </div>
        </nav>
      </aside>
      <main className={larguraTotal ? "app__conteudo app__conteudo--total" : "app__conteudo"}>{children}</main>
    </div>
  );
}
