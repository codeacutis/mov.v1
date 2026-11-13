import { useState, type FormEvent } from 'react';
import AuthLayout from '../../components/AuthLayout';
import Campo from '../../components/Campo';
import { apiRequest, ApiRequestError } from '../../services/api';
import './RecuperarSenha.css';

interface RecuperarSenhaProps {
  onVoltar: () => void;
}

export default function RecuperarSenha({ onVoltar }: RecuperarSenhaProps) {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setEnviado(true);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 404) {
        setErro('Recuperação de senha ainda não está disponível. Entre em contato com o administrador.');
      } else if (cause instanceof TypeError) {
        setErro('Não foi possível acessar a API. Confira se o backend está em execução.');
      } else {
        // Por segurança, não revelar se o e-mail existe ou não.
        setEnviado(true);
      }
    } finally {
      setCarregando(false);
    }
  }

  if (enviado) {
    return (
      <AuthLayout>
        <div className="formulario" role="status">
          <div className="selo" aria-hidden="true">✓</div>
          <h2>Verifique seu e-mail</h2>
          <p className="formulario__subtitulo">
            Se <strong>{email}</strong> estiver cadastrado, você receberá em
            instantes um link para criar uma nova senha. O link vale por 30
            minutos.
          </p>
          <p className="formulario__subtitulo">
            Não recebeu? Confira a caixa de spam ou{' '}
            <button type="button" className="link" onClick={() => setEnviado(false)}>
              tente outro e-mail
            </button>
            .
          </p>
          <button type="button" className="botao botao--primario" onClick={onVoltar}>
            Voltar para o login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="formulario" onSubmit={aoEnviar}>
        <button type="button" className="link link--voltar" onClick={onVoltar}>
          ‹ Voltar para o login
        </button>
        <h2>Recuperar senha</h2>
        <p className="formulario__subtitulo">
          Informe o e-mail cadastrado e enviaremos um link para você criar uma
          nova senha.
        </p>

        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}

        <Campo
          id="email"
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          placeholder="nome.sobrenome@prefeitura.gov.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" className="botao botao--primario" disabled={carregando}>
          {carregando ? 'Enviando…' : 'Enviar link de recuperação'}
        </button>
      </form>
    </AuthLayout>
  );
}
