import { Tournament } from "@/lib/bracket";
import TeamAvatar from "./TeamAvatar";

export default function TeamsTab({
  tournament,
}: {
  tournament: Tournament;
}) {
  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-[#050a10] p-6">
        <h2 className="text-2xl font-black">
          Equipos participantes
        </h2>

        <p className="mt-2 text-gray-500">
          {tournament.teamCount} equipos registrados.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tournament.teams.map((team) => (
            <div
              key={team}
className="group rounded-xl border border-white/10 bg-[#0b1219] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:bg-[#101923] hover:shadow-[0_0_35px_rgba(239,68,68,0.18)]"
            >
              <div className="flex items-center gap-4">
                <TeamAvatar
                  team={{
                    id: team,
                    name: team,
                    seed: 0,
                  }}
                  size="medium"
                />

                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {team}
                  </p>

<p className="mt-1 text-xs text-gray-500">
  Participante oficial
</p>

<div className="mt-3 space-y-1 text-[11px]">
  <p className="text-gray-400">
    🎮 {tournament.game}
  </p>

  <p className="text-gray-400">
    🏆 Torneo activo
  </p>
</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}