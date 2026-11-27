const paths: Record<string, string> = {
  Painel: "M3 4h18v12H3z M8 21h8 M12 16v5",
  Viagens: "M4 6h12l-3-3 M16 6l-3 3 M20 18H8l3-3 M8 18l3 3",
  "Agenda da frota": "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2",
  Veículos:
    "M3 16V8h14l4 5v3 M3 12h18 M7 8v4 M12 8v4 M7 16h10 M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  Motoristas:
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2 M9 17l3 3 3-3",
  Passageiros:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 21v-2a6 6 0 0 1 12 0v2 M17 5a3 3 0 0 1 0 6 M18 15a5 5 0 0 1 3 5",
  Relatórios: "M5 3h10l4 4v14H5z M9 17v-4 M12 17V9 M15 17v-6",
  "App do motorista": "M7 2h10v20H7z M11 18h2",
  Sair: "M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4",
};
export default function Icon({ name }: { name: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.Painel} />
    </svg>
  );
}
