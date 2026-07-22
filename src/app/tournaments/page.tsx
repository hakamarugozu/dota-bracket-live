"use client";

import { useEffect, useState } from "react";
import { getMyTournaments, deleteTournament } from "@/lib/tournaments";
import { Tournament } from "@/types/tournament";
import TournamentCard from "@/components/tournaments/TournamentCard";
import EmptyState from "@/components/tournaments/EmptyState";

export default function MyTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTournaments() {
    setLoading(true);

    const data = await getMyTournaments();

    setTournaments(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "¿Estás seguro de eliminar este torneo?"
    );

    if (!confirmDelete) return;

    await deleteTournament(id);

    await loadTournaments();
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-red-500">
            Mis Torneos
          </h1>

          <p className="text-gray-400 mt-2">
            Administra todos tus torneos desde un solo lugar.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-24 text-gray-400">
            Cargando torneos...
          </div>
        ) : tournaments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}