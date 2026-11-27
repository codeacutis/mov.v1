// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DetalhesViagem from './DetalhesViagem';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const departure = '2099-02-10T06:00:00.000Z';
const participation = {
  id: 'part1', patientId: 'p1', patient: { name: 'Paciente fictício', phone: '00000000000' },
  appointmentLocationName: 'Hospital fictício', appointmentAddress: 'Rua de teste', appointmentMunicipality: 'Cidade fictícia',
  appointmentAt: '2099-02-10T10:00:00.000Z', priority: 'MEDIUM', priorityJustification: 'Organização administrativa',
  priorityDefinedAt: departure, priorityDefinedBy: { name: 'Admin fictício' }, confirmationStatus: 'PENDING', cancelledAt: null,
  cancellationReason: null, _count: { companions: 0 },
};
function setup(withParticipation = false) {
  let participants = withParticipation ? [participation] : [];
  const companions: { id: string; name: string; phone: string; relationship: string }[] = [];
  const fetch = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    let data: unknown;
    if (url.pathname === '/patients') {
      const q = url.searchParams.get('q');
      const rows = q === 'inexistente' ? [] : q ? [{ id: 'p2', name: 'Paciente pesquisado', isActive: true }] : [{ id: 'p1', name: 'Paciente fictício', isActive: true }];
      data = { data: rows, total: rows.length, page: 1, limit: 20 };
    } else if (url.pathname.endsWith('/observations')) data = [];
    else if (url.pathname.endsWith('/companions')) {
      if (init?.method === 'POST') {
        companions.push({ ...body, id: 'c1' });
        participants = participants.map(item => ({ ...item, _count: { companions: 1 } }));
      }
      data = companions;
    } else if (url.pathname.endsWith('/patient-trips')) {
      if (init?.method === 'POST') participants = [{ ...participation, ...body, patient: { name: 'Paciente pesquisado', phone: '00000000000' } }];
      data = participants;
    } else data = { status: 'SCHEDULED', plannedDepartureAt: departure, municipalPickupPoint: 'Terminal fictício', vehicle: { capacity: 4, plate: 'TST0001', description: 'Van municipal' }, actualDepartureAt: null, actualReturnStartAt: null, actualReturnAt: null };
    return { ok: true, status: 200, json: async () => data };
  });
  vi.stubGlobal('fetch', fetch);
  render(<DetalhesViagem tripId="t1" onVoltar={vi.fn()} />);
  return fetch;
}

it('pesquisa pela API, seleciona o resultado e salva atualizando os participantes', async () => {
  const fetch = setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar paciente' }));
  fireEvent.change(screen.getByLabelText('Pesquisar pacientes cadastrados'), { target: { value: 'pesquisado' } });
  fireEvent.click(await screen.findByRole('radio', { name: /Paciente pesquisado/ }));
  expect(fetch.mock.calls.some(([url]) => new URL(url).searchParams.get('q') === 'pesquisado')).toBe(true);
  fireEvent.change(screen.getByLabelText('Estabelecimento'), { target: { value: 'Hospital fictício' } });
  fireEvent.change(screen.getByLabelText('Município'), { target: { value: 'Cidade fictícia' } });
  fireEvent.change(screen.getByLabelText('Endereço da consulta'), { target: { value: 'Rua de teste' } });
  fireEvent.change(screen.getByLabelText('Justificativa da prioridade'), { target: { value: 'Organização administrativa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar participação' }));
  await screen.findByRole('heading', { name: 'Paciente pesquisado' });
  const created = fetch.mock.calls.find(([url, init]) => new URL(url).pathname.endsWith('/patient-trips') && init?.method === 'POST');
  expect(JSON.parse(String(created?.[1]?.body))).toMatchObject({ patientId: 'p2', appointmentAt: departure });
  expect(within(screen.getByRole('region', { name: 'Ocupação' })).getByText('3')).toBeTruthy();
});

it('mostra busca vazia e permite limpar para pesquisar novamente', async () => {
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar paciente' }));
  fireEvent.change(screen.getByLabelText('Pesquisar pacientes cadastrados'), { target: { value: 'inexistente' } });
  await screen.findByText(/Nenhum paciente encontrado/);
  fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
  await screen.findByRole('radio', { name: /Paciente fictício/ });
});

it('usa a saída como mínimo e impede consulta anterior ao editar', async () => {
  const fetch = setup(true);
  fireEvent.click(await screen.findByRole('button', { name: 'Editar consulta e prioridade' }));
  const date = screen.getByLabelText('Data e horário da consulta') as HTMLInputElement;
  expect(new Date(date.min).toISOString()).toBe(departure);
  fireEvent.change(date, { target: { value: '2099-02-09T12:00' } });
  expect(screen.getByRole('alert').textContent).toMatch(/anterior à saída/);
  fireEvent.submit(screen.getByRole('form', { name: 'Editar participação' }));
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
});

it('aplica a máscara ao cadastrar e editar acompanhante, e atualiza a ocupação', async () => {
  const fetch = setup(true);
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar acompanhante' }));
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Acompanhante fictício' } });
  fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '00900000000' } });
  expect((screen.getByLabelText('Telefone') as HTMLInputElement).value).toBe('(00) 9 0000 - 0000');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar acompanhante' }));
  await screen.findByText('Acompanhante fictício');
  expect(within(screen.getByRole('region', { name: 'Ocupação' })).getByText('2')).toBeTruthy();
  expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST' && JSON.parse(String(init.body)).phone === '(00) 9 0000 - 0000')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Editar acompanhante' }));
  await waitFor(() => expect((screen.getByLabelText('Telefone') as HTMLInputElement).value).toBe('(00) 9 0000 - 0000'));
});
