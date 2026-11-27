import { useEffect, useState } from "react";
import AppLayout from "../../components/AppLayout";
import Icon from "../../components/Icon";
import {
  apiRequest,
  apiErrorMessage,
  type PageResult,
} from "../../services/api";
import { vehicleLabel } from "../../services/vehicle-label";
import "./Painel.css";
interface Vehicle {
  id: string;
  plate: string;
  description: string | null;
  capacity: number;
  status: string;
}
interface Driver {
  id: string;
  isActive: boolean;
  user: { name: string };
}
interface Overview {
  vehicles: PageResult<Vehicle>;
  drivers: PageResult<Driver>;
  patients: number;
  trips: number;
}
export default function Painel({
  onNavegar,
  onSair,
}: {
  onNavegar: (item: string) => void;
  onSair: () => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [vehicles, drivers, patients, trips] = await Promise.all([
          apiRequest<PageResult<Vehicle>>("/vehicles?page=1&limit=5", {
            signal: controller.signal,
          }),
          apiRequest<PageResult<Driver>>("/drivers?page=1&limit=5", {
            signal: controller.signal,
          }),
          apiRequest<PageResult<unknown>>("/patients?page=1&limit=1", {
            signal: controller.signal,
          }),
          apiRequest<PageResult<unknown>>("/trips?page=1&limit=1", {
            signal: controller.signal,
          }),
        ]);
        if (!controller.signal.aborted)
          setData({
            vehicles,
            drivers,
            patients: patients.total,
            trips: trips.total,
          });
      } catch (cause) {
        if (!controller.signal.aborted) setError(apiErrorMessage(cause));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);
  return (
    <AppLayout ativo="Painel" onNavegar={onNavegar} onSair={onSair}>
      <header className="cabecalho cabecalho--linha">
        <div>
          <p className="sobretitulo">Visão geral</p>
          <h1>Painel administrativo</h1>
          <p>Cadastros e recursos do transporte municipal, em um só lugar.</p>
        </div>
        <button
          className="botao botao--primario"
          onClick={() => onNavegar("Nova viagem")}
        >
          + Nova viagem
        </button>
      </header>
      {loading ? (
        <p role="status">Carregando visão geral…</p>
      ) : error ? (
        <p role="alert" className="aviso aviso--erro">
          {error}
        </p>
      ) : (
        data && (
          <>
            <section
              className="painel-resumo"
              aria-label="Resumo dos cadastros"
            >
              {[
                ["Veículos", data.vehicles.total],
                ["Motoristas", data.drivers.total],
                ["Passageiros", data.patients],
                ["Viagens", data.trips],
              ].map(([name, count]) => (
                <button
                  className="cartao painel-metrica"
                  key={name}
                  onClick={() => onNavegar(String(name))}
                >
                  <span className="painel-metrica__icone">
                    <Icon name={String(name)} />
                  </span>
                  <span>
                    {name === "Passageiros" ? "Pacientes cadastrados" : name}
                  </span>
                  <strong>{count}</strong>
                  <small>
                    Ver {name === "Viagens" ? "viagens" : "cadastros"} →
                  </small>
                </button>
              ))}
            </section>
            <p className="texto-suave">
              Totais de todos os cadastros, incluindo registros inativos e
              históricos.
            </p>
            <div className="painel-listas">
              <section className="cartao">
                <div className="painel-secao">
                  <div>
                    <h2>Veículos cadastrados</h2>
                    <p className="texto-suave">
                      Primeiros 5 veículos por placa
                    </p>
                  </div>
                  <button
                    className="link"
                    onClick={() => onNavegar("Veículos")}
                  >
                    Ver todos
                  </button>
                </div>
                {data.vehicles.data.length ? (
                  <ul className="painel-lista">
                    {data.vehicles.data.map((v) => (
                      <li key={v.id}>
                        <span className="painel-lista__icone">
                          <Icon name="Veículos" />
                        </span>
                        <div>
                          <strong>{vehicleLabel(v)}</strong>
                          <small>
                            {v.plate} · {v.capacity} lugares
                          </small>
                        </div>
                        <span
                          className={`status ${v.status === "ACTIVE" ? "status--ok" : "status--alerta"}`}
                        >
                          {v.status === "ACTIVE"
                            ? "Ativo"
                            : v.status === "IN_MAINTENANCE"
                              ? "Manutenção"
                              : "Inativo"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nenhum veículo cadastrado.</p>
                )}
              </section>
              <section className="cartao">
                <div className="painel-secao">
                  <div>
                    <h2>Motoristas cadastrados</h2>
                    <p className="texto-suave">
                      Primeiros 5 motoristas por nome
                    </p>
                  </div>
                  <button
                    className="link"
                    onClick={() => onNavegar("Motoristas")}
                  >
                    Ver todos
                  </button>
                </div>
                {data.drivers.data.length ? (
                  <ul className="painel-lista">
                    {data.drivers.data.map((d) => (
                      <li key={d.id}>
                        <span className="painel-lista__icone">
                          <Icon name="Motoristas" />
                        </span>
                        <div>
                          <strong>{d.user.name}</strong>
                          <small>Motorista municipal</small>
                        </div>
                        <span
                          className={`status ${d.isActive ? "status--ok" : "status--alerta"}`}
                        >
                          {d.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nenhum motorista cadastrado.</p>
                )}
              </section>
            </div>
            <section className="painel-atalho cartao">
              <div>
                <h2>Acompanhe a operação</h2>
                <p className="texto-suave">
                  Consulte a programação da frota ou analise os indicadores por
                  período nos relatórios.
                </p>
              </div>
              <button
                className="botao botao--secundario"
                onClick={() => onNavegar("Agenda da frota")}
              >
                Abrir agenda
              </button>
              <button
                className="botao botao--secundario"
                onClick={() => onNavegar("Relatórios")}
              >
                Ver relatórios
              </button>
            </section>
          </>
        )
      )}
      <button
        className="link"
        disabled={loading}
        onClick={() => setRevision((value) => value + 1)}
      >
        Atualizar visão geral
      </button>
    </AppLayout>
  );
}
