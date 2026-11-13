import { useState, type FormEvent } from "react";
import AuthLayout from "../components/AuthLayout";
import Campo from "../components/Campo";

interface LoginProps {
  onEntrar: () => void;
  onEsqueciSenha: () => void;
}

export default function Login({ onEntrar, onEsqueciSenha }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);

  // Tela apenas visual: sem validar nada, o botão só avança para a próxima tela.
  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onEntrar();
  }

  return (
    <AuthLayout>
      <form className="formulario" onSubmit={aoEnviar}>
        <h2>Entrar no Mov+</h2>
        <p className="formulario__subtitulo">
          Use o usuário e a senha fornecidos pela prefeitura.
        </p>

        <Campo
          id="usuario"
          rotulo="Usuário ou e-mail"
          type="text"
          autoComplete="username"
          placeholder="nome.sobrenome@prefeitura.gov.br"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
        />

        <Campo
          id="senha"
          rotulo="Senha"
          type={mostrarSenha ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          adorno={
            <button
              type="button"
              className="campo__acao"
              aria-pressed={mostrarSenha}
              onClick={() => setMostrarSenha((v) => !v)}
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          }
        />

        <div className="formulario__linha">
          <label className="check">
            <input
              type="checkbox"
              checked={manterConectado}
              onChange={(e) => setManterConectado(e.target.checked)}
            />
            Manter conectado
          </label>
          <button type="button" className="link" onClick={onEsqueciSenha}>
            Esqueci minha senha
          </button>
        </div>

        <button type="submit" className="botao botao--primario">
          Entrar
        </button>
      </form>
    </AuthLayout>
  );
}
