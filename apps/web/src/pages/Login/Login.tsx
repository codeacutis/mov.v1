import { useState, type FormEvent } from 'react';
import AuthLayout from '../../components/AuthLayout';
import Campo from '../../components/Campo';
import { apiRequest, ApiRequestError, saveAccessToken } from '../../services/api';
import './Login.css';

interface LoginProps {
  onEntrar: () => void;
  onEsqueciSenha: () => void;
}
interface LoginResponse {
  accessToken: string;
  expiresAt: string;
}

export default function Login({ onEntrar, onEsqueciSenha }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function aoEnviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const result = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: usuario, password: senha }),
      });
      saveAccessToken(result.accessToken, manterConectado);
      onEntrar();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setErro('E-mail ou senha inválidos.');
      } else if (cause instanceof TypeError) {
        setErro('Não foi possível acessar a API. Confira se o backend está em execução.');
      } else {
        setErro(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout>
      <form className="formulario" onSubmit={aoEnviar}>
        <h2>Entrar no Mov+</h2>
        <p className="formulario__subtitulo">
          Use o usuário e a senha fornecidos pela prefeitura.
        </p>

        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}

        <Campo
          id="usuario"
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          placeholder="nome.sobrenome@prefeitura.gov.br"
          value={usuario}
          onChange={(event) => setUsuario(event.target.value)}
          required
        />

        <Campo
          id="senha"
          rotulo="Senha"
          type={mostrarSenha ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          required
          adorno={
            <button
              type="button"
              className="campo__acao"
              aria-pressed={mostrarSenha}
              onClick={() => setMostrarSenha((value) => !value)}
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          }
        />

        <div className="formulario__linha">
          <label className="check">
            <input
              type="checkbox"
              checked={manterConectado}
              onChange={(event) => setManterConectado(event.target.checked)}
            />
            Manter conectado
          </label>
          <button type="button" className="link" onClick={onEsqueciSenha}>
            Esqueci minha senha
          </button>
        </div>

        <button type="submit" className="botao botao--primario" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  );
}