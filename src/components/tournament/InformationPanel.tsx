import type {
  Tournament,
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

import InformationRow from "./InformationRow";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type InformationPanelProps = {
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

export default function InformationPanel({
  tournament,
  bracket,
}: InformationPanelProps) {
  const doubleElimination =
    isDoubleBracket(bracket);

  const roundCount =
    doubleElimination
      ? bracket.winnerRounds.length +
        bracket.loserRounds.length +
        (bracket.grandFinal ? 1 : 0) +
        (
          bracket.resetFinal &&
          (
            bracket.resetFinal.team1 ||
            bracket.resetFinal.team2 ||
            bracket.resetFinal.completed
          )
            ? 1
            : 0
        )
      : bracket.rounds.length;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1219] p-4">
      <h3 className="text-xs font-black">
        INFORMACIÓN
      </h3>

      <div className="mt-4 space-y-3 text-xs">
        <InformationRow
          label="Juego"
          value={tournament.game}
        />

        <InformationRow
          label="Equipos"
          value={`${tournament.teamCount}`}
        />

        <InformationRow
          label="Rondas"
          value={`${roundCount}`}
        />

        <InformationRow
          label="Formato"
          value={
            doubleElimination
              ? "Eliminación doble"
              : "Eliminación simple"
          }
        />
      </div>
    </div>
  );
}