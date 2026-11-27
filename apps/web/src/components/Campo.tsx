import type { InputHTMLAttributes, ReactNode } from "react";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  rotulo: string;
  /** Elemento exibido ao lado direito do campo (ex.: botão de mostrar senha) */
  adorno?: ReactNode;
}

export default function Campo({ id, rotulo, adorno, ...props }: CampoProps) {
  const type = props.type ?? 'text';
  const maxLength = props.maxLength ?? (type === 'email' ? 254 : type === 'password' ? 72 : ['text', 'search', 'tel', 'url'].includes(type) ? 200 : undefined);
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo__entrada">
        <input id={id} {...props} maxLength={maxLength} />
        {adorno}
      </div>
    </div>
  );
}
