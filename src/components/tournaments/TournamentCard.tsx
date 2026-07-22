"use client";

import Link from "next/link";
import { Tournament } from "@/types/tournament";

type Props = {
  tournament: Tournament;
  onDelete: (id: string) => void;
};

function statusColor(status: string) {
  switch (status) {
    case "Borrador":
      return "bg-gray-600";

    case "Inscripciones abiertas":
      return "bg-green-600";

    case "Próximamente":
      return "bg-yellow-500";

    case "En curso":
      return "bg-blue-600";

    case "Finalizado":
      return "bg-red-600";

    default:
      return "bg-gray-600";
  }
}

export default function TournamentCard({
  tournament,
  onDelete,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 hover:border-red-500/40 transition">

      <div className="flex items-start justify-between">

        <div>

          <h2 className="text-2xl font-bold text-white">
            {tournament.name}
          </h2>

          <p className="mt-2 text-gray-500">
            {tournament.organization}
          </p>

        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusColor(
            tournament.status
          )}`}
        >
          {tournament.status}
        </span>

      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-8">

        <Info
          label="Juego"
          value={tournament.game}
        />

        <Info
          label="Formato"
          value={tournament.format}
        />

        <Info
          label="Equipos"
          value={`${tournament.teams}`}
        />

        <Info
          label="Servidor"
          value={tournament.server}
        />

        <Info
          label="Fecha"
          value={tournament.date}
        />

        <Info
          label="Hora"
          value={tournament.time}
        />

      </div>

      <div className="flex flex-wrap gap-3 mt-8">

        <Link
          href={`/tournaments/${tournament.id}`}
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-semibold"
        >
          Abrir Centro del Torneo
        </Link>

        <Link
          href={`/tournaments/edit/${tournament.id}`}
          className="bg-neutral-700 hover:bg-neutral-600 px-5 py-3 rounded-xl"
        >
          Editar
        </Link>

        <button
          className="bg-neutral-700 hover:bg-neutral-600 px-5 py-3 rounded-xl"
        >
          Compartir
        </button>

        <button
          onClick={() => onDelete(tournament.id)}
          className="bg-red-950 hover:bg-red-800 px-5 py-3 rounded-xl"
        >
          Eliminar
        </button>

      </div>

    </div>
  );
}

type InfoProps = {
  label: string;
  value: string;
};

function Info({
  label,
  value,
}: InfoProps) {
  return (
    <div>

      <p className="text-xs uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="text-white font-semibold mt-1">
        {value}
      </p>

    </div>
  );
}