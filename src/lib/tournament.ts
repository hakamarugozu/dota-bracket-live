/**
 * Utilidades del torneo.
 */

export function getTeamInitials(
  teamName: string
) {
  const initials = teamName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "?";
}

export function hashTeamName(
  teamName: string
) {
  let hash = 0;

  for (
    let index = 0;
    index < teamName.length;
    index += 1
  ) {
    hash =
      teamName.charCodeAt(index) +
      ((hash << 5) - hash);

    hash |= 0;
  }

  return hash;
}

export function getTeamIdentity(
  teamName: string
) {
  const palettes = [
    {
      from: "#ef4444",
      to: "#7f1d1d",
      glow: "rgba(239,68,68,0.42)",
    },
    {
      from: "#3b82f6",
      to: "#1e3a8a",
      glow: "rgba(59,130,246,0.42)",
    },
    {
      from: "#8b5cf6",
      to: "#4c1d95",
      glow: "rgba(139,92,246,0.42)",
    },
    {
      from: "#10b981",
      to: "#064e3b",
      glow: "rgba(16,185,129,0.42)",
    },
    {
      from: "#f59e0b",
      to: "#78350f",
      glow: "rgba(245,158,11,0.42)",
    },
    {
      from: "#ec4899",
      to: "#831843",
      glow: "rgba(236,72,153,0.42)",
    },
    {
      from: "#06b6d4",
      to: "#164e63",
      glow: "rgba(6,182,212,0.42)",
    },
    {
      from: "#84cc16",
      to: "#365314",
      glow: "rgba(132,204,22,0.42)",
    },
    {
      from: "#f97316",
      to: "#7c2d12",
      glow: "rgba(249,115,22,0.42)",
    },
    {
      from: "#6366f1",
      to: "#312e81",
      glow: "rgba(99,102,241,0.42)",
    },
    {
      from: "#14b8a6",
      to: "#134e4a",
      glow: "rgba(20,184,166,0.42)",
    },
    {
      from: "#eab308",
      to: "#713f12",
      glow: "rgba(234,179,8,0.42)",
    },
  ];

  const normalizedName =
    teamName.trim().toLowerCase();

  const hash =
    hashTeamName(normalizedName);

  const positiveHash =
    Math.abs(hash);

  const palette =
    palettes[
      positiveHash %
        palettes.length
    ];

  const angle =
    120 + (positiveHash % 80);

  return {
    gradient: `linear-gradient(${angle}deg, ${palette.from}, ${palette.to})`,
    glow: palette.glow,
  };
}

export function getTeamLogo(
  teamName: string
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedTournament =
      localStorage.getItem(
        "currentTournament"
      );

    if (!savedTournament) {
      return null;
    }

    const tournament =
      JSON.parse(savedTournament) as {
        teamDetails?: {
          name: string;
          logoUrl?: string | null;
        }[];
      };

    const normalizedTeamName =
      teamName.trim().toLowerCase();

    const teamDetail =
      tournament.teamDetails?.find(
        (team) =>
          team.name
            .trim()
            .toLowerCase() ===
          normalizedTeamName
      );

    return teamDetail?.logoUrl || null;
  } catch {
    return null;
  }
}