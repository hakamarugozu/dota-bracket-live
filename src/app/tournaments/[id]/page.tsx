"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { Tournament } from "@/types/tournament";

import InfoCard from "@/components/tournament/InfoCard";
import MenuGrid from "@/components/tournament/MenuGrid";

export default function TournamentCenterPage() {
  const params = useParams();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTournament() {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) {
        setTournament(data as Tournament);
      }

      setLoading(false);
    }

    if (id) {
      loadTournament();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        Cargando torneo...
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        Torneo no encontrado.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">

      <div className="max-w-7xl mx-auto px-6 py-6">

        <Link
          href="/tournaments"
          className="text-sm text-red-400 hover:text-red-300"
        >
          ← Mis Torneos
        </Link>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#151515] p-5">

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-3xl font-bold">
                {tournament.name}
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                {tournament.organization}
                {" • "}
                {tournament.game}
                {" • "}
                {tournament.teams} Equipos
                {" • "}
                {tournament.server}
              </p>

            </div>

            <span className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold">
              {tournament.status}
            </span>

          </div>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

          <InfoCard
            title="Juego"
            value={tournament.game}
          />

          <InfoCard
            title="Equipos"
            value={String(tournament.teams)}
          />

          <InfoCard
            title="Fecha"
            value={tournament.date}
          />

          <InfoCard
            title="Hora"
            value={tournament.time}
          />

        </div>

        <div className="mt-6">

          <MenuGrid />

        </div>

      </div>

    </main>
  );
}