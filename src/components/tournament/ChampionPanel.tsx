import { TournamentBracket } from "../../../lib/bracket";
import TeamAvatar from "./TeamAvatar";

type ChampionPanelProps = {
  bracket: TournamentBracket;
};

export default function ChampionPanel({
  bracket,
}: ChampionPanelProps) {
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

      <p className="mt-4 text-xl font-black text-yellow-300">
        {bracket.champion?.name ??
          "Por definir"}
      </p>
    </div>
  );
}