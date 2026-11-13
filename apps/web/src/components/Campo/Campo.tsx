import type { InputHTMLAttributes, ReactNode } from "react";
import "./Campo.css";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  rotulo: string;
  adorno?: ReactNode;
}

export default function Campo({ id, rotulo, adorno, ...props }: CampoProps) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo__entrada">
        <input id={id} {...props} />
        {adorno}
      </div>
    </div>
  );
}
