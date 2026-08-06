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

type TournamentWithOrganization =
  Tournament & {
    organization?: string | null;
  };

type TournamentHeroProps = {
  tournament: TournamentWithOrganization;
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

function isW3ArenaOrganization(
  organization: string | null | undefined
): boolean {
  return (
    String(organization ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ===
    "w3arena"
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

  const showW3ArenaThanks =
    isW3ArenaOrganization(
      tournament.organization
    );

  const angularShape = {
    clipPath:
      "polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)",
  } as const;

  return (
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_30%,rgba(127,29,29,0.12),transparent_35%),#060b11]">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-400">
            <span className="mr-1.5 text-red-500">
              ●
            </span>
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

        {showW3ArenaThanks && (
          <div className="w-full lg:max-w-[660px]">
            <div
              className="bg-gradient-to-r from-red-500/90 via-red-500/25 to-red-500/70 p-px shadow-[0_18px_60px_rgba(0,0,0,0.38)]"
              style={angularShape}
            >
              <div
                className="relative overflow-hidden bg-[radial-gradient(circle_at_85%_50%,rgba(127,29,29,0.18),transparent_35%),linear-gradient(100deg,#08090c,#0d0d11_55%,#09090c)] px-5 py-4 sm:px-6"
                style={angularShape}
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-red-500" />
                <div className="pointer-events-none absolute -right-14 -top-16 h-32 w-32 rounded-full border border-red-500/10" />

                <div className="relative flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center text-red-500">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-6 w-6"
                    >
                      <path
                        d="m12 2.8 2.72 5.5 6.08.88-4.4 4.28 1.04 6.04L12 16.64 6.56 19.5l1.04-6.04-4.4-4.28 6.08-.88L12 2.8Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-100 sm:text-[11px]">
                      Agradecimiento especial a{" "}
                      <span className="text-red-400">
                        Kami y W3Arena
                      </span>
                    </p>

                    <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 sm:text-[10px]">
                      Por confiar en Esports Bracket Live para la gestión profesional de este torneo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}