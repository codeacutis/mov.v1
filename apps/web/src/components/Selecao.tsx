import type { SelectHTMLAttributes } from "react";

export type Opcao = string | { valor: string; rotulo: string };

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  rotulo: string;
  opcoes: Opcao[];
}

export default function Selecao({ id, rotulo, opcoes, ...props }: SelecaoProps) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} {...props}>
        {opcoes.map((opcao) => {
          const valor = typeof opcao === "string" ? opcao : opcao.valor;
          const texto = typeof opcao === "string" ? opcao : opcao.rotulo;
          return (
            <option key={valor} value={valor}>
              {texto}
            </option>
          );
        })}
      </select>
    </div>
  );
}
