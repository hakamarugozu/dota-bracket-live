import type {
  Tournament,
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type TournamentHeroProps = {
  tournament: Tournament;
  bracket: ActiveBracket;
};

function isDoubleBracket(
  bracket: ActiveBracket
): bracket is DoubleTournamentBracket {
  return (
    "winnerRounds" in bracket &&
    "loserRounds" in bracket
  );
}

export default function TournamentHero({
  tournament,
  bracket,
}: TournamentHeroProps) {
  const matches = isDoubleBracket(bracket)
    ? [
        ...bracket.winnerRounds.flatMap(
          (round) => round.matches
        ),

        ...bracket.loserRounds.flatMap(
          (round) => round.matches
        ),

        ...(bracket.grandFinal
          ? [bracket.grandFinal]
          : []),

        ...(bracket.resetFinal &&
        (
          bracket.resetFinal.team1 ||
          bracket.resetFinal.team2 ||
          bracket.resetFinal.completed
        )
          ? [bracket.resetFinal]
          : []),
      ]
    : bracket.rounds.flatMap(
        (round) => round.matches
      );

  const completedMatches =
    matches.filter(
      (match) => match.completed
    ).length;

  const formatLabel =
    isDoubleBracket(bracket)
      ? "DOBLE ELIMINACIÓN"
      : "ELIMINACIÓN SIMPLE";

  return (
    <section className="border-b border-white/10 bg-[#060b11]">
      <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6">
        <p className="text-[10px] font-black text-green-400">
          ●{" "}
          {bracket.champion
            ? "TORNEO FINALIZADO"
            : "TORNEO EN CURSO"}
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          {tournament.name}
        </h1>

        <p className="mt-4 text-xs font-bold tracking-wide text-gray-500">
          {tournament.game} ·{" "}
          {tournament.teamCount} EQUIPOS ·{" "}
          {formatLabel} ·{" "}
          {matches.length} PARTIDOS ·{" "}
          {completedMatches} FINALIZADOS
        </p>
      </div>
    </section>
  );
}