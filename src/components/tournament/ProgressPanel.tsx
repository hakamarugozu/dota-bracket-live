import type {
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ProgressPanelProps = {
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

export default function ProgressPanel({
  bracket,
}: ProgressPanelProps) {
  const matches = isDoubleBracket(
    bracket
  )
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

  const completed =
    matches.filter(
      (match) => match.completed
    ).length;

  const percentage =
    matches.length > 0
      ? Math.round(
          (completed /
            matches.length) *
            100
        )
      : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1219] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black">
          PROGRESO
        </p>

        <span className="text-xs font-black text-red-400">
          {percentage}%
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-400">
        {completed} de {matches.length} partidos
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black">
        <div
          className="h-full bg-red-500 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}