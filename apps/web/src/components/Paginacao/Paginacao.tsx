interface PaginacaoProps {
  page: number;
  totalPages: number;
  onGoTo: (p: number) => void;
}

export default function Paginacao({ page, totalPages, onGoTo }: PaginacaoProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="paginacao" aria-label="Paginação">
      <button
        type="button"
        className="botao botao--secundario paginacao__btn"
        onClick={() => onGoTo(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        ‹
      </button>
      <span className="paginacao__info">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className="botao botao--secundario paginacao__btn"
        onClick={() => onGoTo(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        ›
      </button>
    </nav>
  );
}
