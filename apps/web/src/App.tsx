import { useCallback, useEffect, useState } from 'react';

import {
  apiRequest,
  clearAccessToken,
  getAccessToken,
  saveUserRole,
  type AuthUser,
  type UserRole,
} from './services/api';

import Login from './pages/Login/Login';
import RecuperarSenha from './pages/RecuperarSenha/RecuperarSenha';
import Painel from './pages/Painel/Painel';
import Viagens from './pages/Viagens/Viagens';
import AgendaFrota from './pages/AgendaFrota/AgendaFrota';
import CadastroVeiculo from './pages/CadastroVeiculo/CadastroVeiculo';
import CadastroMotorista from './pages/CadastroMotorista/CadastroMotorista';
import CadastroPassageiro from './pages/CadastroPassageiro/CadastroPassageiro';
import Relatorios from './pages/Relatorios/Relatorios';
import AppMotorista from './pages/AppMotorista/AppMotorista';

type Tela =
  | 'login'
  | 'recuperar'
  | 'painel'
  | 'viagem'
  | 'agenda'
  | 'veiculo'
  | 'motorista'
  | 'passageiro'
  | 'relatorios'
  | 'appMotorista';

const TELAS_DO_MENU: Record<string, Tela> = {
  Painel: 'painel',
  Viagens: 'viagem',
  'Agenda da frota': 'agenda',
  Veículos: 'veiculo',
  Motoristas: 'motorista',
  Passageiros: 'passageiro',
  Relatórios: 'relatorios',
  'App do motorista': 'appMotorista',
};

function telaInicial(role: UserRole): Tela {
  return role === 'ADMIN' ? 'painel' : 'appMotorista';
}

function telaPermitida(tela: Tela, role: UserRole): boolean {
  if (role === 'ADMIN') {
    return tela !== 'login' && tela !== 'recuperar';
  }

  return tela === 'appMotorista';
}

export default function App() {
  const [tela, setTela] = useState<Tela>('login');
  const [usuario, setUsuario] = useState<AuthUser | null>(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  const [abrirNovaViagem, setAbrirNovaViagem] = useState(false);

  const validarSessao = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setUsuario(null);
      setTela('login');
      setVerificandoSessao(false);
      return;
    }

    try {
      const user = await apiRequest<AuthUser>('/auth/me');

      if (user.role !== 'ADMIN' && user.role !== 'MOTORISTA') {
        throw new Error('Perfil de usuário inválido.');
      }

      setUsuario(user);
      saveUserRole(user.role);
      setTela(telaInicial(user.role));
    } catch {
      clearAccessToken();
      setUsuario(null);
      setTela('login');
    } finally {
      setVerificandoSessao(false);
    }
  }, []);

  useEffect(() => {
  let ativo = true;

  async function verificar() {
    try {
      const token = getAccessToken();

      if (!token) {
        if (ativo) {
          setUsuario(null);
          setTela('login');
          setVerificandoSessao(false);
        }
        return;
      }

      const usuarioAutenticado = await apiRequest<AuthUser>('/auth/me');

      if (!ativo) return;

      if (
        usuarioAutenticado.role !== 'ADMIN' &&
        usuarioAutenticado.role !== 'MOTORISTA'
      ) {
        throw new Error('Perfil de usuário inválido.');
      }

      saveUserRole(usuarioAutenticado.role);
      setUsuario(usuarioAutenticado);
      setTela(
        usuarioAutenticado.role === 'ADMIN'
          ? 'painel'
          : 'appMotorista'
      );
    } catch {
      if (ativo) {
        clearAccessToken();
        setUsuario(null);
        setTela('login');
      }
    } finally {
      if (ativo) {
        setVerificandoSessao(false);
      }
    }
  }

  void verificar();

  return () => {
    ativo = false;
  };
}, []);

  async function entrar() {
    setVerificandoSessao(true);
    await validarSessao();
  }

  async function sair() {
    try {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Mesmo se a API estiver indisponível, removemos a sessão local.
    } finally {
      clearAccessToken();
      setUsuario(null);
      setAbrirNovaViagem(false);
      setTela('login');
    }
  }

  function navegar(item: string) {
    if (!usuario) return;

    if (item === 'Nova viagem') {
      if (usuario.role !== 'ADMIN') return;

      setAbrirNovaViagem(true);
      setTela('viagem');
      return;
    }

    const destino = TELAS_DO_MENU[item];

    if (!destino) return;

    if (!telaPermitida(destino, usuario.role)) {
      setTela(telaInicial(usuario.role));
      return;
    }

    setAbrirNovaViagem(false);
    setTela(destino);
  }

  if (verificandoSessao) {
    return (
      <main className="tela-carregamento">
        <p role="status">Verificando sessão...</p>
      </main>
    );
  }

  if (!usuario) {
    if (tela === 'recuperar') {
      return (
        <RecuperarSenha
          onVoltar={() => setTela('login')}
        />
      );
    }

    return (
      <Login
        onEntrar={entrar}
        onEsqueciSenha={() => setTela('recuperar')}
      />
    );
  }

  // Proteção adicional contra navegação para telas incompatíveis.
  if (!telaPermitida(tela, usuario.role)) {
    return usuario.role === 'ADMIN'
      ? <Painel onNavegar={navegar} onSair={sair} />
      : <AppMotorista onNavegar={navegar} onSair={sair} />;
  }

  const interna = {
    onNavegar: navegar,
    onSair: sair,
  };

  switch (tela) {
    case 'painel':
      return <Painel {...interna} />;

    case 'viagem':
      return (
        <Viagens
          key={abrirNovaViagem ? 'nova' : 'lista'}
          iniciarCriando={abrirNovaViagem}
          {...interna}
        />
      );

    case 'agenda':
      return <AgendaFrota {...interna} />;

    case 'veiculo':
      return <CadastroVeiculo {...interna} />;

    case 'motorista':
      return <CadastroMotorista {...interna} />;

    case 'passageiro':
      return <CadastroPassageiro {...interna} />;

    case 'relatorios':
      return <Relatorios {...interna} />;

    case 'appMotorista':
      return <AppMotorista {...interna} />;

    default:
      return usuario.role === 'ADMIN'
        ? <Painel {...interna} />
        : <AppMotorista {...interna} />;
  }
}