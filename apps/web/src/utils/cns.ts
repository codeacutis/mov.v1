/** Validação local do CNS: https://integracao.esusaps.bridge.ufsc.tech/ledi/documentacao/regras/algoritmo_CNS.html */
export function isValidCns(value: string): boolean {
  if (!/^[125789]\d{14}$/.test(value)) return false;
  const digits = [...value].map(Number);
  if (value[0] === '1' || value[0] === '2') {
    const sum = digits.slice(0, 11).reduce((total, digit, index) => total + digit * (15 - index), 0);
    const check = (11 - sum % 11) % 11;
    const suffix = check === 10 ? `001${11 - (sum + 2) % 11}` : `000${check}`;
    return value === value.slice(0, 11) + suffix;
  }
  return digits.reduce((total, digit, index) => total + digit * (15 - index), 0) % 11 === 0;
}
