// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CadastroVeiculo from '../pages/CadastroVeiculo/CadastroVeiculo';
import CadastroPassageiro from '../pages/CadastroPassageiro/CadastroPassageiro';
import GerenciarParadas from '../pages/GerenciarParadas/GerenciarParadas';
import Viagens from '../pages/Viagens/Viagens';
import Auditoria from './Auditoria';
import { isValidCns } from '../utils/cns';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const navigation = { onNavegar: vi.fn(), onSair: vi.fn() };
const page = (data: unknown[], total = data.length, limit = 20) => ({ data, total, page: 1, limit });
function mockApi(handler: (url: URL, init: RequestInit, body: Record<string, unknown>) => unknown) {
  const fetch = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const data = url.pathname === '/auth/me' ? { name: 'Admin fictício', role: 'ADMIN' } : handler(url, init, body);
    return { ok: true, status: 200, json: async () => data };
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

it('limita o veículo a 60 lugares na interface e mantém veículos menores', async () => {
  const fetch = mockApi(() => page([]));
  render(<CadastroVeiculo {...navigation} />);
  fireEvent.click(screen.getByRole('button', { name: 'Novo veículo' }));
  const description = screen.getByLabelText(/Nome ou modelo/) as HTMLInputElement;
  const capacity = screen.getByLabelText('Capacidade de passageiros') as HTMLInputElement;
  expect(description.maxLength).toBe(160); expect(capacity.min).toBe('1'); expect(capacity.max).toBe('60');
  fireEvent.change(screen.getByLabelText('Placa'), { target: { value: 'TST0001' } });
  fireEvent.change(capacity, { target: { value: '61' } });
  fireEvent.submit(capacity.closest('form')!);
  expect(screen.getByRole('alert').textContent).toContain('entre 1 e 60');
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  fireEvent.change(capacity, { target: { value: '12' } });
  fireEvent.submit(capacity.closest('form')!);
  await screen.findByText('Veículo cadastrado.');
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST' && JSON.parse(String(init.body)).capacity === 12)).toBe(true);
});

it('valida CNS opcional, envia somente dígitos e exibe marcação como texto', async () => {
  const patients: Record<string, unknown>[] = [];
  const fetch = mockApi((url, init, body) => {
    if (init.method === 'POST') { patients.push({ ...body, id: 'p1', isActive: true }); return patients[0]; }
    return url.pathname === '/patients' ? page(patients) : [];
  });
  render(<CadastroPassageiro {...navigation} />);
  fireEvent.click(screen.getByRole('button', { name: 'Novo paciente' }));
  const name = screen.getByLabelText('Nome completo') as HTMLInputElement;
  const cns = screen.getByLabelText('Cartão SUS (opcional)') as HTMLInputElement;
  expect(name.maxLength).toBe(200); expect(cns.required).toBe(false); expect(cns.maxLength).toBe(18);
  expect(screen.getByLabelText('Logradouro (opcional)')).toBeTruthy();
  fireEvent.change(name, { target: { value: '<script>texto fictício</script>' } });
  fireEvent.change(screen.getByLabelText('Data de nascimento'), { target: { value: '1980-01-01' } });
  fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '00900000000' } });
  fireEvent.change(cns, { target: { value: '700000000000006' } });
  fireEvent.submit(name.closest('form')!);
  expect(screen.getByRole('alert').textContent).toContain('Cartão SUS válido');
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  fireEvent.change(cns, { target: { value: '700000000000005' } });
  expect(cns.value).toBe('700 0000 0000 0005');
  fireEvent.submit(name.closest('form')!);
  await screen.findByText('Paciente cadastrado.');
  await screen.findByText('<script>texto fictício</script>');
  expect(document.querySelector('script')).toBeNull();
  expect(patients[0].susCardNumber).toBe('700000000000005');
});

it('inclui uma parada ao final sem campo de sequência e preserva os vínculos', async () => {
  const stop = { id: 's1', direction: 'OUTBOUND', sequence: 3, name: 'Local fictício anterior', address: 'Rua fictícia', municipality: 'Município fictício', stopType: 'APPOINTMENT', outboundPatientTrips: [], returnPatientTrips: [] };
  const fetch = mockApi(url => url.pathname.endsWith('/stops') ? [stop] : url.pathname.endsWith('/patient-trips') ? [{ id: 'pt1', cancelledAt: null, patient: { id: 'p1', name: 'Paciente fictício' } }] : { status: 'SCHEDULED', routeApprovedAt: null, municipalPickupPoint: 'Terminal' });
  render(<GerenciarParadas tripId="t1" onVoltar={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Nova parada' }));
  expect(screen.queryByLabelText('Sequência')).toBeNull();
  fireEvent.change(screen.getByLabelText('Nome do local'), { target: { value: 'Novo estabelecimento' } });
  fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'Rua fictícia, 1' } });
  fireEvent.change(screen.getByLabelText('Município'), { target: { value: 'Cidade fictícia' } });
  fireEvent.click(screen.getByLabelText('Paciente fictício'));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar parada' }));
  await screen.findByText('Parada salva. Revise a ida e o retorno e aprove novamente.');
  const saved = fetch.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(saved?.[1]?.body))).toMatchObject({ sequence: 4, direction: 'OUTBOUND', patients: [{ patientId: 'p1' }] });
});

it('cancela uma viagem pelo diálogo e atualiza a listagem', async () => {
  let status = 'SCHEDULED';
  const fetch = mockApi((url, init) => {
    if (init.method === 'PATCH') { status = 'CANCELLED'; return {}; }
    if (url.pathname === '/trips') return page([{ id: 't1', status, municipalPickupPoint: 'Terminal fictício', plannedDepartureAt: '2099-01-01T06:00:00Z', vehicle: { id: 'v1', description: 'Van municipal', plate: 'TST0001' }, driver: { id: 'd1', user: { name: 'Motorista fictício' } } }]);
    return page([]);
  });
  render(<Viagens {...navigation} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
  const dialog = screen.getByRole('dialog', { name: 'Cancelar viagem' });
  expect(within(dialog).getByText(/Van municipal/)).toBeTruthy();
  expect((within(dialog).getByLabelText('Motivo') as HTMLTextAreaElement).maxLength).toBe(500);
  fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'Cancelamento fictício' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cancelamento' }));
  await screen.findByText('Viagem cancelada.');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull());
  expect(fetch.mock.calls.some(([url, init]) => new URL(url).pathname === '/trips/t1/cancel' && init?.method === 'PATCH')).toBe(true);
});

it('mostra auditoria em tabela compacta com opções independentes da página e filtros removíveis', async () => {
  const fetch = mockApi(url => url.pathname === '/audit/options' ? { actions: ['PATIENT_CREATED', 'TRIP_CREATED'], entityTypes: ['Patient', 'Trip'] } : page([{ id: 'a1', action: 'TRIP_CREATED', entityType: 'Trip', entityId: 't1', actorUserId: 'u1', actor: { name: 'Admin fictício' }, occurredAt: '2099-01-01T06:00:00Z', reason: null, changes: { status: 'SCHEDULED' } }], 1, 10));
  render(<Auditoria />);
  await screen.findByRole('table');
  expect(screen.getByRole('option', { name: 'PATIENT_CREATED' })).toBeTruthy();
  expect(document.querySelector('details')?.open).toBe(false);
  fireEvent.change(screen.getByLabelText('Ação'), { target: { value: 'PATIENT_CREATED' } });
  fireEvent.change(screen.getByLabelText('Entidade'), { target: { value: 'Patient' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pesquisar auditoria' }));
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => new URL(url).searchParams.get('action') === 'PATIENT_CREATED' && new URL(url).searchParams.get('entityType') === 'Patient' && new URL(url).searchParams.get('limit') === '10')).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  await waitFor(() => expect(new URL(fetch.mock.calls.at(-1)![0]).searchParams.has('action')).toBe(false));
  expect((screen.getByLabelText('Ação') as HTMLSelectElement).value).toBe('');
});

it.each(['100000000000007', '100000000060018', '100000000080000', '500000000000002', '700000000000005'])('aceita CNS sintético com verificador válido: %s', value => expect(isValidCns(value)).toBe(true));
it.each(['700000000000006', '300000000000000', '000000000000000', '123'])('recusa CNS inválido: %s', value => expect(isValidCns(value)).toBe(false));
