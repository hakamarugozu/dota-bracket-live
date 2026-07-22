import { TournamentBracket } from "../../../lib/bracket";
import TeamAvatar from "./TeamAvatar";

type ChampionCardProps = {
  bracket: TournamentBracket;
};

export default function ChampionCard({
  bracket,
}: ChampionCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 text-center shadow-2xl ${
        bracket.champion
          ? "border-yellow-500/55 bg-gradient-to-b from-yellow-950/75 via-[#181006] to-black"
          : "border-white/15 bg-[#0a1017]"
      }`}
    >
      {bracket.champion ? (
        <div className="flex justify-center">
          <TeamAvatar
            team={bracket.champion}
            winner
            size="large"
          />
        </div>
      ) : (
        <div className="text-4xl">
          🏆
        </div>
      )}

      <p className="mt-3 text-[10px] font-black tracking-[0.22em] text-yellow-500">
        CAMPEÓN
      </p>

      <p
        className={`mt-2 break-words text-base font-black ${
          bracket.champion
            ? "text-yellow-200"
            : "text-gray-400"
        }`}
      >
        {bracket.champion?.name ?? "POR DEFINIR"}
      </p>
    </div>
  );
}