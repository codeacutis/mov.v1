import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth">
      <section className="auth__marca">
        <div className="logo">
          <span className="logo__icone">+</span>
          Mov+
        </div>
        <h1>Cada viagem organizada, cada paciente no horário.</h1>
        <p>
          Gestão do transporte municipal para a Secretaria de Saúde e para o
          setor de transporte.
        </p>
      </section>
      <main className="auth__conteudo">{children}</main>
    </div>
  );
}
