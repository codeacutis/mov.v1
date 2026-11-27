import { apenasDigitos } from './mascaras';

/** Apresentação local; mantém suporte a telefones fixos e celulares. */
export function telefoneAcompanhante(value: string): string {
  const digits = apenasDigitos(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const number = digits.slice(2);
  const prefix = digits.length > 10 ? `${number[0]} ${number.slice(1, 5)}` : number.slice(0, 4);
  const suffix = digits.length > 10 ? number.slice(5) : number.slice(4);
  return `(${digits.slice(0, 2)}) ${prefix}${suffix ? ` - ${suffix}` : ''}`;
}
