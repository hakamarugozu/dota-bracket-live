import { TournamentBracket } from "../../../lib/bracket";

type ProgressPanelProps = {
  bracket: TournamentBracket;
};

export default function ProgressPanel({
  bracket,
}: ProgressPanelProps) {
  const matches = bracket.rounds.flatMap(
    (round) => round.matches
  );

  const completed = matches.filter(
    (match) => match.completed
  ).length;

  const percentage =
    matches.length > 0
      ? Math.round(
          (completed / matches.length) * 100
        )
      : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1219] p-4">
      <p className="text-xs font-black">
        PROGRESO
      </p>

      <p className="mt-2 text-sm text-gray-400">
        {completed} de {matches.length} partidos
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black">
        <div
          className="h-full bg-red-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}