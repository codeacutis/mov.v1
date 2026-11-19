import { useEffect, useState, type FormEvent } from 'react';
import Campo from '../Campo';
import Selecao from '../Selecao';
import { apiRequest, apiErrorMessage, fetchAllPages } from '../../services/api';
import './FormularioViagem.css';

interface FormularioViagemProps {
  onConcluir: (salvou: boolean) => void;
}

interface Vehicle {
  id: string;
  plate: string;
  capacity: number;
  status: 'ACTIVE' | 'IN_MAINTENANCE' | 'INACTIVE';
}

interface Driver {
  id: string;
  isActive: boolean;
  user: { name: string };
}

interface Patient {
  id: string;
  name: string;
  isActive: boolean;
}

interface FormViagem {
  vehicleId: string;
  driverId: string;
  municipalPickupPoint: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
}

const FORM_VAZIO: FormViagem = {
  vehicleId: '',
  driverId: '',
  municipalPickupPoint: '',
  departureDate: '',
  departureTime: '',
  returnDate: '',
  returnTime: '',
};

function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function FormularioViagem({ onConcluir }: FormularioViagemProps) {
  const [form, setForm] = useState<FormViagem>(FORM_VAZIO);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [erroCadastros, setErroCadastros] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([
      fetchAllPages<Vehicle>('/vehicles', signal),
      fetchAllPages<Driver>('/drivers', signal),
      fetchAllPages<Patient>('/patients', signal),
    ]).then(([v, d, p]) => {
      if (signal.aborted) return;
      setVehicles(v.filter((vehicle) => vehicle.status === 'ACTIVE'));
      setDrivers(d.filter((driver) => driver.isActive));
      setPatients(p.filter((patient) => patient.isActive));
      setLoadingData(false);
    }).catch((cause: unknown) => {
      if (signal.aborted) return;
      controller.abort();
      setErroCadastros(apiErrorMessage(cause));
      setLoadingData(false);
    });

    return () => controller.abort();
  }, [tentativa]);

  function tentarNovamente() {
    setErroCadastros('');
    setLoadingData(true);
    setTentativa((anterior) => anterior + 1);
  }

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/trips', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          driverId: form.driverId,
          municipalPickupPoint: form.municipalPickupPoint.trim(),
          plannedDepartureAt: toIso(form.departureDate, form.departureTime),
          plannedReturnStartAt: toIso(form.returnDate, form.returnTime),
        }),
      });
      onConcluir(true);
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setSaving(false);
    }
  }

  const vehicleOptions = [
    { valor: '', rotulo: 'Selecione um veículo' },
    ...vehicles.map((v) => ({ valor: v.id, rotulo: `${v.plate} · ${v.capacity} lugares` })),
  ];

  const driverOptions = [
    { valor: '', rotulo: 'Selecione um motorista' },
    ...drivers.map((d) => ({ valor: d.id, rotulo: d.user.name })),
  ];

  return (
    <>
      <header className="cabecalho cabecalho--linha">
        <div>
          <h1>Nova viagem</h1>
          <p>Preencha os dados da viagem.</p>
        </div>
        <div className="cabecalho__acoes">
          <button type="button" className="botao botao--secundario" onClick={() => onConcluir(false)}>
            ‹ Voltar para viagens
          </button>
        </div>
      </header>

      {loadingData ? (
        <p role="status">Carregando dados…</p>
      ) : erroCadastros ? (
        <section className="cartao">
          <div className="aviso aviso--erro" role="alert">
            Não foi possível carregar os cadastros. {erroCadastros}
          </div>
          <button type="button" className="botao botao--secundario" onClick={tentarNovamente}>
            Tentar novamente
          </button>
        </section>
      ) : (
        <form className="duas-colunas" onSubmit={aoEnviar}>
          <section className="cartao">
            {error && <div className="aviso aviso--erro" role="alert">{error}</div>}

            <fieldset className="secao">
              <legend>Dados da viagem</legend>
              <div className="grade">
                <Campo
                  id="local-saida"
                  rotulo="Local de saída municipal"
                  placeholder="Praça da Saúde"
                  value={form.municipalPickupPoint}
                  onChange={(e) => setForm({ ...form, municipalPickupPoint: e.target.value })}
                  required
                />
                <Campo
                  id="data-saida"
                  rotulo="Data de saída"
                  type="date"
                  value={form.departureDate}
                  onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                  required
                />
                <Campo
                  id="hora-saida"
                  rotulo="Horário de saída"
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                  required
                />
                <Campo
                  id="data-retorno"
                  rotulo="Data de início do retorno"
                  type="date"
                  value={form.returnDate}
                  onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                  required
                />
                <Campo
                  id="hora-retorno"
                  rotulo="Horário de início do retorno"
                  type="time"
                  value={form.returnTime}
                  onChange={(e) => setForm({ ...form, returnTime: e.target.value })}
                  required
                />
              </div>
            </fieldset>

            <fieldset className="secao">
              <legend>Veículo e motorista</legend>
              <div className="grade">
                <Selecao
                  id="veiculo"
                  rotulo="Veículo"
                  opcoes={vehicleOptions}
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  disabled={vehicles.length === 0}
                  required
                />
                {vehicles.length === 0 && <p className="texto-suave">Nenhum veículo ativo cadastrado.</p>}
                {selectedVehicle && (
                  <p className="texto-suave">
                    Capacidade: <strong>{selectedVehicle.capacity}</strong> passageiros
                  </p>
                )}
                <Selecao
                  id="motorista"
                  rotulo="Motorista"
                  opcoes={driverOptions}
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                  disabled={drivers.length === 0}
                  required
                />
                {drivers.length === 0 && <p className="texto-suave">Nenhum motorista ativo cadastrado.</p>}
              </div>
            </fieldset>

            <div className="acoes">
              <button type="button" className="botao botao--secundario" onClick={() => onConcluir(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="botao botao--primario"
                disabled={saving || vehicles.length === 0 || drivers.length === 0}>
                {saving ? 'Salvando…' : 'Salvar viagem'}
              </button>
            </div>
          </section>

          <section className="cartao">
            <h2 className="cartao__titulo">Pacientes cadastrados</h2>
            <p className="texto-suave">
              Participantes são adicionados à viagem após a criação.
            </p>
            {patients.length === 0 ? (
              <p className="texto-suave">Nenhum paciente ativo cadastrado.</p>
            ) : (
              <ul className="lista-passageiros">
                {patients.map((p) => (
                  <li key={p.id}>
                    <span>{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </form>
      )}
    </>
  );
}
