import type {
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

import TeamAvatar from "./TeamAvatar";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ChampionPanelProps = {
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

export default function ChampionPanel({
  bracket,
}: ChampionPanelProps) {
  const doubleElimination =
    isDoubleBracket(bracket);

  return (
    <div className="rounded-2xl border border-yellow-500/25 bg-[#0b1219] p-6 text-center">
      {bracket.champion ? (
        <div className="flex justify-center">
          <TeamAvatar
            team={bracket.champion}
            winner
            size="large"
          />
        </div>
      ) : (
        <div className="text-5xl">
          🏆
        </div>
      )}

      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500">
        {doubleElimination
          ? "Campeón de doble eliminación"
          : "Campeón del torneo"}
      </p>

      <p className="mt-2 text-xl font-black text-yellow-300">
        {bracket.champion?.name ??
          "Por definir"}
      </p>

      {!bracket.champion &&
        doubleElimination && (
          <p className="mt-3 text-xs leading-5 text-gray-500">
            Se definirá después de la Gran Final o de la Reset Final.
          </p>
        )}
    </div>
  );
}