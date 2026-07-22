import TeamAvatar from "@/components/tournament/TeamAvatar";
import {
  BracketMatch,
  TournamentBracket,
} from "../../../lib/bracket";

type MatchWithRound = BracketMatch & {
  roundName: string;
};

type MatchCardProps = {
  match: MatchWithRound;
};

function MatchCard({ match }: MatchCardProps) {
  const winner =
    match.winnerId === match.team1?.id
      ? match.team1
      : match.winnerId === match.team2?.id
        ? match.team2
        : null;

  const status =
    match.completed
      ? "FINALIZADO"
      : match.team1 && match.team2
        ? "PENDIENTE"
        : "BLOQUEADO";

  const statusClass =
    match.completed
      ? "bg-green-500/20 text-green-300"
      : match.team1 && match.team2
        ? "bg-yellow-500/20 text-yellow-300"
        : "bg-gray-700 text-gray-400";

  return (
    <div className="group rounded-lg border border-white/10 bg-[#0b1219] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-500/25 hover:bg-[#101923] hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-red-400">
            {match.roundName}
          </p>

          <p className="mt-1 text-lg font-black text-white">
            Match #{match.matchIndex + 1}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[10px] font-black ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamAvatar
            team={match.team1}
            size="small"
          />

          <span className="truncate font-bold text-white">
            {match.team1?.name ?? "Pendiente"}
          </span>
        </div>

        <div className="text-sm font-black text-gray-500">
          VS
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <span className="truncate text-right font-bold text-white">
            {match.team2?.name ?? "Pendiente"}
          </span>

          <TeamAvatar
            team={match.team2}
            size="small"
          />
        </div>
      </div>

      {match.completed && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-400">
              Resultado
            </span>

            <span className="text-lg font-black text-green-300">
              {match.score1} - {match.score2}
            </span>
          </div>

          {winner && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <TeamAvatar
                team={winner}
                winner
                size="small"
              />

              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-wide text-green-400">
                  GANADOR
                </p>

                <p className="truncate font-black text-white">
                  {winner.name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type MatchSectionProps = {
  title: string;
  count: number;
  indicatorClass: string;
  matches: MatchWithRound[];
  emptyMessage: string;
};

function MatchSection({
  title,
  count,
  indicatorClass,
  matches,
  emptyMessage,
}: MatchSectionProps) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${indicatorClass}`}
        />

        <h3 className="text-lg font-black text-white">
          {title} ({count})
        </h3>
      </div>

      {matches.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm font-bold text-gray-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export default function MatchesTab({
  bracket,
}: {
  bracket: TournamentBracket;
}) {
  const matches: MatchWithRound[] =
    bracket.rounds.flatMap((round) =>
      round.matches.map((match) => ({
        ...match,
        roundName: round.name,
      }))
    );

  const finishedMatches = matches.filter(
    (match) => match.completed
  );

  const pendingMatches = matches.filter(
    (match) =>
      !match.completed &&
      Boolean(match.team1) &&
      Boolean(match.team2)
  );

  const undefinedMatches = matches.filter(
    (match) =>
      !match.completed &&
      (!match.team1 || !match.team2)
  );

  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-[#050a10] p-5 sm:p-6">
        <h2 className="text-2xl font-black text-white">
          Partidos del torneo
        </h2>

        <p className="mt-2 text-gray-500">
          {matches.length} partidos en total.
        </p>

        <div className="mt-8 space-y-10">
          <MatchSection
            title="Finalizados"
            count={finishedMatches.length}
            indicatorClass="bg-green-500"
            matches={finishedMatches}
            emptyMessage="Todavía no hay partidos finalizados."
          />

          <MatchSection
            title="Pendientes"
            count={pendingMatches.length}
            indicatorClass="bg-yellow-500"
            matches={pendingMatches}
            emptyMessage="No hay partidos pendientes con ambos equipos definidos."
          />

          <MatchSection
            title="Por definir"
            count={undefinedMatches.length}
            indicatorClass="bg-gray-500"
            matches={undefinedMatches}
            emptyMessage="No hay enfrentamientos por definir."
          />
        </div>
      </div>
    </section>
  );
}