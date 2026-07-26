import TeamAvatar from "@/components/tournament/TeamAvatar";

import type {
  BracketMatch,
  TournamentBracket,
} from "@/lib/bracket";

import type {
  BracketSection,
  DoubleBracketMatch,
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ActiveMatch =
  | BracketMatch
  | DoubleBracketMatch;

type MatchWithRound = ActiveMatch & {
  displayRoundName: string;
  displaySection: BracketSection | "single";
};

type MatchCardProps = {
  match: MatchWithRound;
};

function isDoubleBracket(
  bracket: ActiveBracket
): bracket is DoubleTournamentBracket {
  return (
    "winnerRounds" in bracket &&
    "loserRounds" in bracket
  );
}

function isDoubleMatch(
  match: ActiveMatch
): match is DoubleBracketMatch {
  return (
    "section" in match &&
    "automaticAdvance" in match
  );
}

function getSectionLabel(
  section: MatchWithRound["displaySection"]
): string {
  if (section === "winner") {
    return "WINNER BRACKET";
  }

  if (section === "loser") {
    return "LOSER BRACKET";
  }

  if (section === "grand-final") {
    return "GRAN FINAL";
  }

  if (section === "reset-final") {
    return "RESET FINAL";
  }

  return "ELIMINACIÓN SIMPLE";
}

function getSectionClass(
  section: MatchWithRound["displaySection"]
): string {
  if (section === "loser") {
    return "text-violet-400";
  }

  if (
    section === "grand-final" ||
    section === "reset-final"
  ) {
    return "text-yellow-400";
  }

  return "text-red-400";
}

function getCardHoverClass(
  section: MatchWithRound["displaySection"]
): string {
  if (section === "loser") {
    return "hover:border-violet-500/30";
  }

  if (
    section === "grand-final" ||
    section === "reset-final"
  ) {
    return "hover:border-yellow-500/30";
  }

  return "hover:border-red-500/25";
}

function MatchCard({
  match,
}: MatchCardProps) {
  const winner =
    match.winnerId === match.team1?.id
      ? match.team1
      : match.winnerId === match.team2?.id
        ? match.team2
        : null;

  const automaticAdvance =
    isDoubleMatch(match) &&
    match.automaticAdvance;

  const status = automaticAdvance
    ? "BYE"
    : match.completed
      ? "FINALIZADO"
      : match.team1 && match.team2
        ? "PENDIENTE"
        : "BLOQUEADO";

  const statusClass = automaticAdvance
    ? "bg-amber-500/20 text-amber-300"
    : match.completed
      ? "bg-green-500/20 text-green-300"
      : match.team1 && match.team2
        ? "bg-yellow-500/20 text-yellow-300"
        : "bg-gray-700 text-gray-400";

  return (
    <div
      className={`group rounded-lg border border-white/10 bg-[#0b1219] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#101923] hover:shadow-lg ${getCardHoverClass(
        match.displaySection
      )}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-black tracking-[0.14em] ${getSectionClass(
              match.displaySection
            )}`}
          >
            {getSectionLabel(
              match.displaySection
            )}
          </p>

          <p className="mt-1 truncate text-xs font-black text-gray-400">
            {match.displayRoundName}
          </p>

          <p className="mt-1 text-lg font-black text-white">
            Match #{match.matchIndex + 1}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamAvatar
            team={match.team1}
            winner={
              match.winnerId ===
              match.team1?.id
            }
            size="small"
          />

          <span
            className={`truncate font-bold ${
              match.winnerId ===
              match.team1?.id
                ? "text-green-300"
                : "text-white"
            }`}
          >
            {match.team1?.name ??
              "Pendiente"}
          </span>
        </div>

        <div className="text-sm font-black text-gray-500">
          VS
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <span
            className={`truncate text-right font-bold ${
              match.winnerId ===
              match.team2?.id
                ? "text-green-300"
                : "text-white"
            }`}
          >
            {match.team2?.name ??
              "Pendiente"}
          </span>

          <TeamAvatar
            team={match.team2}
            winner={
              match.winnerId ===
              match.team2?.id
            }
            size="small"
          />
        </div>
      </div>

      {match.completed && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-400">
              Resultado
            </span>

            <span className="text-lg font-black text-green-300">
              {match.score1} - {match.score2}
            </span>
          </div>

          {automaticAdvance && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center">
              <p className="text-[10px] font-black tracking-wide text-amber-300">
                AVANCE AUTOMÁTICO
              </p>

              <p className="mt-1 text-sm font-bold text-white">
                Pase libre por BYE
              </p>
            </div>
          )}

          {winner && !automaticAdvance && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <TeamAvatar
                team={winner}
                winner
                size="small"
              />

              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-wide text-green-400">
                  GANADOR
                </p>

                <p className="truncate font-black text-white">
                  {winner.name}
                </p>
              </div>
            </div>
          )}

          {isDoubleMatch(match) &&
            match.section === "loser" &&
            match.loserId && (
              <p className="mt-3 text-center text-[10px] font-black tracking-wide text-red-400">
                EL PERDEDOR QUEDA ELIMINADO
              </p>
            )}
        </div>
      )}
    </div>
  );
}

type MatchSectionProps = {
  title: string;
  count: number;
  indicatorClass: string;
  matches: MatchWithRound[];
  emptyMessage: string;
};

function MatchSection({
  title,
  count,
  indicatorClass,
  matches,
  emptyMessage,
}: MatchSectionProps) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${indicatorClass}`}
        />

        <h3 className="text-lg font-black text-white">
          {title} ({count})
        </h3>
      </div>

      {matches.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm font-bold text-gray-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function getSingleMatches(
  bracket: TournamentBracket
): MatchWithRound[] {
  return bracket.rounds.flatMap(
    (round) =>
      round.matches.map(
        (match) => ({
          ...match,
          displayRoundName:
            round.name,
          displaySection:
            "single" as const,
        })
      )
  );
}

function getDoubleMatches(
  bracket: DoubleTournamentBracket
): MatchWithRound[] {
  const winnerMatches =
    bracket.winnerRounds.flatMap(
      (round) =>
        round.matches.map(
          (match) => ({
            ...match,
            displayRoundName:
              round.name,
            displaySection:
              "winner" as const,
          })
        )
    );

  const loserMatches =
    bracket.loserRounds.flatMap(
      (round) =>
        round.matches.map(
          (match) => ({
            ...match,
            displayRoundName:
              round.name,
            displaySection:
              "loser" as const,
          })
        )
    );

  const finalMatches:
    MatchWithRound[] = [];

  if (bracket.grandFinal) {
    finalMatches.push({
      ...bracket.grandFinal,
      displayRoundName:
        "Gran Final",
      displaySection:
        "grand-final",
    });
  }

  /**
   * La Reset Final existe estructuralmente,
   * pero solamente se muestra cuando ya recibió
   * participantes o cuando fue disputada.
   */
  if (
    bracket.resetFinal &&
    (
      bracket.resetFinal.team1 ||
      bracket.resetFinal.team2 ||
      bracket.resetFinal.completed
    )
  ) {
    finalMatches.push({
      ...bracket.resetFinal,
      displayRoundName:
        "Final de reinicio",
      displaySection:
        "reset-final",
    });
  }

  return [
    ...winnerMatches,
    ...loserMatches,
    ...finalMatches,
  ];
}

export default function MatchesTab({
  bracket,
}: {
  bracket: ActiveBracket;
}) {
  const doubleElimination =
    isDoubleBracket(bracket);

  const matches =
    doubleElimination
      ? getDoubleMatches(bracket)
      : getSingleMatches(bracket);

  const finishedMatches =
    matches.filter(
      (match) => match.completed
    );

  const pendingMatches =
    matches.filter(
      (match) =>
        !match.completed &&
        Boolean(match.team1) &&
        Boolean(match.team2)
    );

  const undefinedMatches =
    matches.filter(
      (match) =>
        !match.completed &&
        (!match.team1 ||
          !match.team2)
    );

  const winnerMatches =
    doubleElimination
      ? matches.filter(
          (match) =>
            match.displaySection ===
            "winner"
        )
      : [];

  const loserMatches =
    doubleElimination
      ? matches.filter(
          (match) =>
            match.displaySection ===
            "loser"
        )
      : [];

  const finals =
    doubleElimination
      ? matches.filter(
          (match) =>
            match.displaySection ===
              "grand-final" ||
            match.displaySection ===
              "reset-final"
        )
      : [];

  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-[#050a10] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">
              Partidos del torneo
            </h2>

            <p className="mt-2 text-gray-500">
              {matches.length} partidos en total.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-xs font-black text-gray-300">
            {doubleElimination
              ? "DOBLE ELIMINACIÓN"
              : "ELIMINACIÓN SIMPLE"}
          </div>
        </div>

        {doubleElimination && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-[10px] font-black tracking-[0.16em] text-red-400">
                WINNER BRACKET
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {winnerMatches.length}
              </p>
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <p className="text-[10px] font-black tracking-[0.16em] text-violet-400">
                LOSER BRACKET
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {loserMatches.length}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-[10px] font-black tracking-[0.16em] text-yellow-400">
                FINALES
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {finals.length}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-10">
          <MatchSection
            title="Finalizados"
            count={
              finishedMatches.length
            }
            indicatorClass="bg-green-500"
            matches={
              finishedMatches
            }
            emptyMessage="Todavía no hay partidos finalizados."
          />

          <MatchSection
            title="Pendientes"
            count={
              pendingMatches.length
            }
            indicatorClass="bg-yellow-500"
            matches={
              pendingMatches
            }
            emptyMessage="No hay partidos pendientes con ambos equipos definidos."
          />

          <MatchSection
            title="Por definir"
            count={
              undefinedMatches.length
            }
            indicatorClass="bg-gray-500"
            matches={
              undefinedMatches
            }
            emptyMessage="No hay enfrentamientos por definir."
          />
        </div>
      </div>
    </section>
  );
}