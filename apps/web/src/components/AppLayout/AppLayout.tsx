import { useState, type ReactNode } from "react";
import "./AppLayout.css";

interface MenuGrupo {
  titulo: string;
  itens: string[];
}

const GRUPOS: MenuGrupo[] = [
  {
    titulo: "Operação",
    itens: ["Painel", "Viagens", "Agenda da frota"],
  },
  {
    titulo: "Cadastros",
    itens: ["Veículos", "Motoristas", "Passageiros"],
  },
  {
    titulo: "Gestão",
    itens: ["Relatórios", "App do motorista"],
  },
  {
    titulo: "Conta",
    itens: ["Sair"],
  },
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
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);

  function toggleGrupo(titulo: string) {
    setGrupoAberto((atual) => (atual === titulo ? null : titulo));
  }

  function handleItemClick(item: string) {
    if (item === "Sair") {
      onSair();
      return;
    }
    onNavegar(item);
  }

  return (
    <div className="app">
      <aside className="menu">
        <div className="logo">
          <span className="logo__icone">+</span>
          Mov+
        </div>

        <nav aria-label="Principal">
          {GRUPOS.map((grupo) => {
            const estaAberto = grupoAberto === grupo.titulo;

            return (
              <div
                key={grupo.titulo}
                role="group"
                aria-label={grupo.titulo}
                className={
                  estaAberto
                    ? "menu__grupo menu__grupo--aberto"
                    : "menu__grupo"
                }
              >
                <button
                  type="button"
                  className="menu__titulo"
                  aria-expanded={estaAberto}
                  onClick={() => toggleGrupo(grupo.titulo)}
                >
                  <span>{grupo.titulo}</span>
                  <span className="menu__seta" aria-hidden="true">
                    ▾
                  </span>
                </button>

                <div className="menu__subitens">
                  {grupo.itens.map((item) => {
                    const isAtivo = item !== "Sair" && item === ativo;

                    return (
                      <button
                        key={item}
                        type="button"
                        className={
                          isAtivo
                            ? "menu__item menu__item--ativo"
                            : "menu__item"
                        }
                        aria-current={isAtivo ? "page" : undefined}
                        onClick={() => handleItemClick(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main
        className={
          larguraTotal
            ? "app__conteudo app__conteudo--total"
            : "app__conteudo"
        }
      >
        {children}
      </main>
    </div>
  );
}