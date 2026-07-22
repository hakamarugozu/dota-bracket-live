import {
  BracketTeam,
} from "../../../lib/bracket";

import {
  getTeamIdentity,
  getTeamInitials,
  getTeamLogo,
} from "../../../lib/tournament";

type TeamAvatarProps = {
  team: BracketTeam | null;
  winner?: boolean;
  size?: "small" | "medium" | "large";
};

export default function TeamAvatar({
  team,
  winner = false,
  size = "medium",
}: TeamAvatarProps) {
  const sizeClasses = {
    small: "h-8 w-8 text-[9px]",
    medium: "h-12 w-12 text-sm",
    large: "h-20 w-20 text-xl",
  };

  if (!team) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-black text-gray-400 ${sizeClasses[size]}`}
      >
        ?
      </div>
    );
  }

  const identity =
    getTeamIdentity(team.name);

  const logoUrl =
    getTeamLogo(team.name);

  return (
    <div
      title={team.name}
      className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-black text-white transition-all duration-300 hover:scale-110 ${sizeClasses[size]} ${
        winner
          ? "border-yellow-300/80 ring-2 ring-yellow-500/20"
          : "border-white/25"
      }`}
      style={{
        background: identity.gradient,
        boxShadow: winner
          ? `0 0 10px ${identity.glow}, inset 0 1px 0 rgba(255,255,255,0.22)`
          : `0 1px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`Logo de ${team.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span className="absolute inset-[3px] rounded-full border border-white/10" />

          <span className="absolute left-[18%] top-[10%] h-[24%] w-[48%] rotate-[-18deg] rounded-full bg-white/15 blur-[1px]" />

          <span className="relative z-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]">
            {getTeamInitials(team.name)}
          </span>
        </>
      )}
    </div>
  );
}