import { isValidCns } from './cns';

describe('CNS sintéticos conforme e-SUS APS', () => {
  it.each(['100000000000007', '200000000000003', '100000000060018', '100000000080000', '500000000000002', '700000000000005', '800000000000001', '900000000000008'])('aceita verificador válido: %s', value => {
    expect(isValidCns(value)).toBe(true);
  });
  it.each(['', '123', '000000000000000', '300000000000000', '700000000000006', '100000000060007', '10000000000000A', '<script>'])('rejeita formato ou verificador inválido: %s', value => {
    expect(isValidCns(value)).toBe(false);
  });
});
