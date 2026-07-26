import { BracketTeam } from "@/lib/bracket";
import TeamAvatar from "./TeamAvatar";

type DialogTeamProps = {
  team: BracketTeam | null;
  winner?: boolean;
};

export default function DialogTeam({
  team,
  winner = false,
}: DialogTeamProps) {
  return (
    <div className="min-w-0 text-center">
      <div className="flex justify-center">
        <TeamAvatar
          team={team}
          winner={winner}
          size="medium"
        />
      </div>

      <p
        className={`mt-2 truncate text-xs font-black ${
          winner ? "text-white" : "text-gray-400"
        }`}
      >
        {team?.name || "Rival pendiente"}
      </p>

      {winner && (
        <p className="mt-1 text-[8px] font-black tracking-wide text-red-400">
          GANADOR
        </p>
      )}
    </div>
  );
}