"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

import {
  deleteTournament,
  getMyTournaments,
} from "@/lib/tournaments";
import TournamentCard from "@/components/tournaments/TournamentCard";
import EmptyState from "@/components/tournaments/EmptyState";
import type { Tournament } from "@/types/tournament";

export default function MyTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTournaments() {
    setLoading(true);

    try {
      const data = await getMyTournaments();
      setTournaments(data);
    } catch (error) {
      console.error(
        "No se pudieron cargar los torneos:",
        error,
      );

      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "¿Estás seguro de eliminar este torneo?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteTournament(id);
      await loadTournaments();
    } catch (error) {
      console.error(
        "No se pudo eliminar el torneo:",
        error,
      );

      window.alert(
        "No se pudo eliminar el torneo. Inténtalo nuevamente.",
      );
    }
  }

  useEffect(() => {
    void loadTournaments();
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-red-500">
              Mis Torneos
            </h1>

            <p className="mt-2 text-gray-400">
              Administra todos tus torneos desde un solo lugar.
            </p>
          </div>

          <div className="flex items-center gap-2">
  <Link
    href="/dashboard"
    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:border-red-500/40 hover:bg-red-600/10 hover:text-white"
  >
    <span>←</span>
    Volver al Dashboard
  </Link>

  <LogoutButton />
</div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-400">
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