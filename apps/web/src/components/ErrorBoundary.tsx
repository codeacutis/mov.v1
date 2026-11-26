import { Component, type ReactNode } from 'react';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (this.state.failed) return <main className="cartao" role="alert"><h1>Não foi possível exibir esta tela.</h1><p>Ocorreu um erro inesperado. Recarregue a página para tentar novamente.</p><button className="botao botao--primario" type="button" onClick={() => window.location.reload()}>Recarregar</button></main>;
    return this.props.children;
  }
}
