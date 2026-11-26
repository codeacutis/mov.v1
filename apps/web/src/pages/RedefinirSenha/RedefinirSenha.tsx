import { useState, type FormEvent } from 'react';
import AuthLayout from '../../components/AuthLayout';
import Campo from '../../components/Campo';
import { apiRequest, ApiRequestError } from '../../services/api';
import './RedefinirSenha.css';

interface RedefinirSenhaProps {
  /** Token recebido por e-mail (?token=...). Vazio quando o link é inválido. */
  token: string;
  onVoltar: () => void;
  /** Link expirado/inválido: volta para pedir um novo. */
  onSolicitarNovo: () => void;
}

// Mesma política do cadastro e da API: 10 a 72 caracteres.
const MIN = 10;
const MAX = 72;

export default function RedefinirSenha({ token, onVoltar, onSolicitarNovo }: RedefinirSenhaProps) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [tokenInvalido, setTokenInvalido] = useState(token === '');
  const [concluido, setConcluido] = useState(false);

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro('');
    if (senha.length < MIN || senha.length > MAX) {
      setErro(`A senha deve ter de ${MIN} a ${MAX} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }
    setCarregando(true);
    try {
      await apiRequest<void>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: senha }),
      });
      setConcluido(true);
    } catch (cause) {
      if (cause instanceof TypeError) {
        setErro('Não foi possível acessar a API. Confira se o backend está em execução.');
      } else if (cause instanceof ApiRequestError && cause.status === 400 && /token/i.test(cause.message)) {
        setTokenInvalido(true);
      } else {
        setErro(cause instanceof Error ? cause.message : 'Não foi possível redefinir a senha.');
      }
    } finally {
      setCarregando(false);
    }
  }

  if (concluido) {
    return (
      <AuthLayout>
        <div className="formulario" role="status">
          <div className="selo" aria-hidden="true">✓</div>
          <h2>Senha redefinida</h2>
          <p className="formulario__subtitulo">
            Sua senha foi alterada. Por segurança, todas as sessões abertas
            foram encerradas. Entre com a nova senha.
          </p>
          <button type="button" className="botao botao--primario" onClick={onVoltar}>
            Ir para o login
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (tokenInvalido) {
    return (
      <AuthLayout>
        <div className="formulario" role="alert">
          <h2>Link inválido ou expirado</h2>
          <p className="formulario__subtitulo">
            Este link de recuperação não pode mais ser usado. Ele vale por tempo
            limitado e só funciona uma vez. Solicite um novo link.
          </p>
          <button type="button" className="botao botao--primario" onClick={onSolicitarNovo}>
            Solicitar novo link
          </button>
          <button type="button" className="link link--voltar" onClick={onVoltar}>
            ‹ Voltar para o login
          </button>
        </div>
      </AuthLayout>
    );
  }

  const adorno = (
    <button type="button" className="campo__acao" aria-pressed={mostrar}
      onClick={() => setMostrar((v) => !v)}>
      {mostrar ? 'Ocultar' : 'Mostrar'}
    </button>
  );

  return (
    <AuthLayout>
      <form className="formulario" onSubmit={aoEnviar}>
        <h2>Criar nova senha</h2>
        <p className="formulario__subtitulo">
          Defina uma nova senha com {MIN} a {MAX} caracteres.
        </p>

        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}

        <Campo id="nova-senha" rotulo="Nova senha" type={mostrar ? 'text' : 'password'}
          autoComplete="new-password" minLength={MIN} maxLength={MAX}
          value={senha} onChange={(e) => setSenha(e.target.value)} required adorno={adorno} />
        <Campo id="confirmar-senha" rotulo="Confirmar nova senha" type={mostrar ? 'text' : 'password'}
          autoComplete="new-password" minLength={MIN} maxLength={MAX}
          value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />

        <button type="submit" className="botao botao--primario" disabled={carregando}>
          {carregando ? 'Salvando…' : 'Redefinir senha'}
        </button>
      </form>
    </AuthLayout>
  );
}
