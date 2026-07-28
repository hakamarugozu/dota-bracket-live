"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import type {
  BracketMatch,
  BracketTeam,
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleBracketMatch,
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

type ClassificationBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ClassificationMatch =
  | BracketMatch
  | DoubleBracketMatch;

type MatchEntry = {
  match: ClassificationMatch;
  stageName: string;
  stageOrder: number;
  eliminatesLoser: boolean;
};

type ParticipantStats = {
  team: BracketTeam;
  played: number;
  wins: number;
  losses: number;
  highestStageName: string;
  highestStageOrder: number;
  eliminated: boolean;
  eliminationStage: string;
  eliminationOrder: number;
  status: "champion" | "runner-up" | "active" | "eliminated";
  rank: number;
};

type ClassificationTabProps = {
  bracket: ClassificationBracket;
  participantLabel?: "Equipo" | "Jugador" | "Participante";
};

function isDoubleBracket(
  bracket: ClassificationBracket,
): bracket is DoubleTournamentBracket {
  return (
    "winnerRounds" in bracket &&
    "loserRounds" in bracket
  );
}

function isAutomaticAdvance(
  match: ClassificationMatch,
) {
  return (
    "automaticAdvance" in match &&
    Boolean(match.automaticAdvance)
  );
}

function collectMatchEntries(
  bracket: ClassificationBracket,
): MatchEntry[] {
  if (!isDoubleBracket(bracket)) {
    return bracket.rounds.flatMap((round) =>
      round.matches.map((match) => ({
        match,
        stageName:
          match.roundName ||
          round.name ||
          `Ronda ${round.index + 1}`,
        stageOrder: round.index,
        eliminatesLoser: true,
      })),
    );
  }

  const winnerEntries =
    bracket.winnerRounds.flatMap((round) =>
      round.matches.map((match) => ({
        match,
        stageName:
          match.roundName ||
          round.name ||
          `Winner Bracket ${round.index + 1}`,
        stageOrder: round.index,
        eliminatesLoser: false,
      })),
    );

  const loserEntries =
    bracket.loserRounds.flatMap((round) =>
      round.matches.map((match) => ({
        match,
        stageName:
          match.roundName ||
          round.name ||
          `Loser Bracket ${round.index + 1}`,
        stageOrder: 100 + round.index,
        eliminatesLoser: true,
      })),
    );

  const finalEntries: MatchEntry[] = [];

  if (bracket.grandFinal) {
    finalEntries.push({
      match: bracket.grandFinal,
      stageName:
        bracket.grandFinal.roundName ||
        "Gran Final",
      stageOrder: 1000,
      eliminatesLoser: true,
    });
  }

  if (
    bracket.resetFinal &&
    (bracket.resetFinal.team1 ||
      bracket.resetFinal.team2 ||
      bracket.resetFinal.completed)
  ) {
    finalEntries.push({
      match: bracket.resetFinal,
      stageName:
        bracket.resetFinal.roundName ||
        "Final de reinicio",
      stageOrder: 1001,
      eliminatesLoser: true,
    });
  }

  return [
    ...winnerEntries,
    ...loserEntries,
    ...finalEntries,
  ];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function buildClassification(
  bracket: ClassificationBracket,
): ParticipantStats[] {
  const entries = collectMatchEntries(bracket);
  const participantMap =
    new Map<string, ParticipantStats>();

  function ensureParticipant(
    team: BracketTeam | null,
  ) {
    if (!team) {
      return null;
    }

    const existing =
      participantMap.get(team.id);

    if (existing) {
      return existing;
    }

    const created: ParticipantStats = {
      team,
      played: 0,
      wins: 0,
      losses: 0,
      highestStageName: "Sin disputar",
      highestStageOrder: -1,
      eliminated: false,
      eliminationStage: "",
      eliminationOrder: -1,
      status: "active",
      rank: 0,
    };

    participantMap.set(team.id, created);
    return created;
  }

  for (const entry of entries) {
    const firstParticipant =
      ensureParticipant(entry.match.team1);

    const secondParticipant =
      ensureParticipant(entry.match.team2);

    for (const participant of [
      firstParticipant,
      secondParticipant,
    ]) {
      if (
        participant &&
        entry.stageOrder >=
          participant.highestStageOrder
      ) {
        participant.highestStageOrder =
          entry.stageOrder;

        participant.highestStageName =
          entry.stageName;
      }
    }

    if (
      !entry.match.completed ||
      !entry.match.team1 ||
      !entry.match.team2 ||
      !entry.match.winnerId ||
      isAutomaticAdvance(entry.match)
    ) {
      continue;
    }

    const winner =
      entry.match.team1.id ===
      entry.match.winnerId
        ? firstParticipant
        : entry.match.team2.id ===
            entry.match.winnerId
          ? secondParticipant
          : null;

    const loser =
      entry.match.team1.id ===
      entry.match.winnerId
        ? secondParticipant
        : entry.match.team2.id ===
            entry.match.winnerId
          ? firstParticipant
          : null;

    if (!winner || !loser) {
      continue;
    }

    winner.played += 1;
    winner.wins += 1;

    loser.played += 1;
    loser.losses += 1;

    const loserIsEliminated =
      !isDoubleBracket(bracket) ||
      loser.losses >= 2;

    if (
      entry.eliminatesLoser &&
      loserIsEliminated
    ) {
      loser.eliminated = true;
      loser.eliminationStage =
        entry.stageName;
      loser.eliminationOrder =
        entry.stageOrder;
    }
  }

  if (bracket.champion) {
    const champion =
      ensureParticipant(bracket.champion);

    if (champion) {
      champion.eliminated = false;
      champion.status = "champion";
      champion.highestStageName =
        "Campeón";
      champion.highestStageOrder =
        Number.MAX_SAFE_INTEGER;
    }
  }

  const participants =
    Array.from(participantMap.values());

  const finalLoser =
    bracket.champion
      ? participants
          .filter(
            (participant) =>
              participant.team.id !==
                bracket.champion?.id &&
              participant.eliminated,
          )
          .sort(
            (first, second) =>
              second.eliminationOrder -
              first.eliminationOrder,
          )[0] ?? null
      : null;

  for (const participant of participants) {
    if (
      bracket.champion &&
      participant.team.id ===
        bracket.champion.id
    ) {
      participant.status = "champion";
      continue;
    }

    if (
      finalLoser &&
      participant.team.id ===
        finalLoser.team.id
    ) {
      participant.status = "runner-up";
      continue;
    }

    participant.status =
      participant.eliminated
        ? "eliminated"
        : "active";
  }

  participants.sort((first, second) => {
    const statusPriority = {
      champion: 0,
      "runner-up": 1,
      active: 2,
      eliminated: 3,
    } as const;

    const statusDifference =
      statusPriority[first.status] -
      statusPriority[second.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (
      first.status === "active" &&
      second.status === "active"
    ) {
      return (
        second.wins - first.wins ||
        first.losses - second.losses ||
        second.highestStageOrder -
          first.highestStageOrder ||
        first.team.name.localeCompare(
          second.team.name,
          "es",
        )
      );
    }

    return (
      second.eliminationOrder -
        first.eliminationOrder ||
      second.wins - first.wins ||
      first.losses - second.losses ||
      first.team.name.localeCompare(
        second.team.name,
        "es",
      )
    );
  });

  let previousGroup = "";
  let previousRank = 0;

  participants.forEach(
    (participant, index) => {
      const group =
        participant.status ===
        "champion"
          ? "champion"
          : participant.status ===
              "runner-up"
            ? "runner-up"
            : participant.status ===
                "active"
              ? `active-${participant.wins}-${participant.losses}-${participant.highestStageOrder}`
              : `eliminated-${participant.eliminationOrder}`;

      if (group !== previousGroup) {
        previousRank = index + 1;
        previousGroup = group;
      }

      participant.rank = previousRank;
    },
  );

  return participants;
}

function getStatusLabel(
  status: ParticipantStats["status"],
) {
  switch (status) {
    case "champion":
      return "Campeón";

    case "runner-up":
      return "Subcampeón";

    case "eliminated":
      return "Eliminado";

    default:
      return "En competencia";
  }
}

function getStatusClasses(
  status: ParticipantStats["status"],
) {
  switch (status) {
    case "champion":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";

    case "runner-up":
      return "border-slate-300/20 bg-slate-300/10 text-slate-200";

    case "eliminated":
      return "border-red-500/20 bg-red-500/[0.07] text-red-300";

    default:
      return "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300";
  }
}

function getRankDisplay(
  participant: ParticipantStats,
) {
  if (participant.status === "champion") {
    return "🥇";
  }

  if (participant.status === "runner-up") {
    return "🥈";
  }

  if (participant.rank === 3) {
    return "🥉";
  }

  return String(participant.rank);
}

export default function ClassificationTab({
  bracket,
  participantLabel = "Participante",
}: ClassificationTabProps) {
  const classification = useMemo(
    () => buildClassification(bracket),
    [bracket],
  );

  const champion =
    classification.find(
      (participant) =>
        participant.status === "champion",
    ) ?? null;

  const runnerUp =
    classification.find(
      (participant) =>
        participant.status === "runner-up",
    ) ?? null;

  const completedMatches =
    classification.reduce(
      (total, participant) =>
        total + participant.played,
      0,
    ) / 2;

  const classificationIsFinal =
    Boolean(bracket.champion);

  const doubleElimination =
    isDoubleBracket(bracket);

  const featuredPlacements =
    classificationIsFinal
      ? classification.slice(2, 4)
      : [];

  const leftPlacement =
    featuredPlacements[0] ?? null;

  const rightPlacement =
    featuredPlacements[1] ?? null;

  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#050a10] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#15171c] via-[#0b0f15] to-[#05070b] px-5 py-7 sm:px-7 lg:px-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-500">
                Resultados del torneo
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                Clasificación{" "}
                {classificationIsFinal
                  ? "final"
                  : "provisional"}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">
                Las posiciones se actualizan automáticamente con los resultados del fixture. Los avances por BYE no cuentan como partido jugado ni como victoria.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <SummaryBadge
                label="Participantes"
                value={String(
                  classification.length,
                )}
              />

              <SummaryBadge
                label="Partidos jugados"
                value={String(
                  completedMatches,
                )}
              />

              <SummaryBadge
                label="Estado"
                value={
                  classificationIsFinal
                    ? "Definitiva"
                    : "En vivo"
                }
                highlighted
              />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden border-b border-white/10 bg-[#080d13] px-5 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-400/[0.05] blur-3xl" />

          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="flex justify-center">
              <MainPodiumCard
                place="1.er lugar"
                title="Campeón del torneo"
                participant={champion}
                icon="🏆"
                emphasis="gold"
                size="hero"
              />
            </div>

            <div className="mt-5 flex justify-center">
              <MainPodiumCard
                place="2.º lugar"
                title="Subcampeón"
                participant={runnerUp}
                icon="🥈"
                emphasis="silver"
                size="secondary"
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-6">
              <SidePlacementCard
                participant={leftPlacement}
                side="left"
                doubleElimination={
                  doubleElimination
                }
              />

              <SidePlacementCard
                participant={rightPlacement}
                side="right"
                doubleElimination={
                  doubleElimination
                }
              />
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-[#070b10] px-5 py-5 sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-500">
            Clasificación general
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-white sm:text-2xl">
                Tabla completa de posiciones
              </h3>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Revisa el rendimiento y la ronda alcanzada por cada participante.
              </p>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
              {classificationIsFinal
                ? "Resultado definitivo"
                : "Actualización en vivo"}
            </span>
          </div>
        </div>

        {classification.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl">
              📊
            </div>

            <h3 className="mt-5 text-lg font-black text-white">
              Clasificación pendiente
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Los participantes aparecerán aquí cuando el fixture tenga equipos o jugadores registrados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-left">
                  <TableHeading className="w-[90px]">
                    Pos.
                  </TableHeading>

                  <TableHeading>
                    {participantLabel}
                  </TableHeading>

                  <TableHeading className="text-center">
                    PJ
                  </TableHeading>

                  <TableHeading className="text-center">
                    V
                  </TableHeading>

                  <TableHeading className="text-center">
                    D
                  </TableHeading>

                  <TableHeading>
                    Ronda alcanzada
                  </TableHeading>

                  <TableHeading>
                    Estado
                  </TableHeading>
                </tr>
              </thead>

              <tbody>
                {classification.map(
                  (participant) => (
                    <tr
                      key={participant.team.id}
                      className="border-b border-white/[0.07] transition last:border-b-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-base font-black text-neutral-300">
                          {getRankDisplay(
                            participant,
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${
                              participant.status ===
                              "champion"
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                                : "border-white/10 bg-[#151a21] text-red-300"
                            }`}
                          >
                            {getInitials(
                              participant.team.name,
                            ) || "P"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {participant.team.name}
                            </p>

                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">
                              Seed #
                              {participant.team.seed}
                            </p>
                          </div>
                        </div>
                      </td>

                      <StatCell
                        value={participant.played}
                      />

                      <StatCell
                        value={participant.wins}
                        positive
                      />

                      <StatCell
                        value={participant.losses}
                        negative
                      />

                      <td className="px-5 py-4 text-sm font-semibold text-neutral-300 sm:px-6">
                        {participant.status ===
                        "champion"
                          ? "Campeón"
                          : participant.eliminationStage ||
                            participant.highestStageName}
                      </td>

                      <td className="px-5 py-4 sm:px-6">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClasses(
                            participant.status,
                          )}`}
                        >
                          {getStatusLabel(
                            participant.status,
                          )}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryBadge({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`min-w-[130px] rounded-xl border px-4 py-3 ${
        highlighted
          ? "border-red-500/25 bg-red-500/10"
          : "border-white/10 bg-black/25"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-600">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          highlighted
            ? "text-red-300"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MainPodiumCard({
  place,
  title,
  participant,
  icon,
  emphasis,
  size,
}: {
  place: string;
  title: string;
  participant: ParticipantStats | null;
  icon: string;
  emphasis: "gold" | "silver";
  size: "hero" | "secondary";
}) {
  const styles = {
    gold: {
      card: "border-amber-400/35 bg-gradient-to-br from-amber-400/[0.12] via-[#17130a] to-[#090b0f] shadow-[0_24px_70px_rgba(245,158,11,0.10)]",
      avatar:
        "border-amber-300/40 bg-amber-400/10 text-amber-200 shadow-[0_0_35px_rgba(251,191,36,0.14)]",
      accent: "text-amber-300",
      badge:
        "border-amber-400/25 bg-amber-400/10 text-amber-200",
    },
    silver: {
      card: "border-slate-300/20 bg-gradient-to-br from-slate-300/[0.08] via-[#11151b] to-[#080a0d] shadow-[0_20px_55px_rgba(148,163,184,0.07)]",
      avatar:
        "border-slate-200/25 bg-slate-200/[0.07] text-slate-100",
      accent: "text-slate-200",
      badge:
        "border-slate-300/20 bg-slate-300/[0.07] text-slate-200",
    },
  } as const;

  const selectedStyle = styles[emphasis];
  const hero = size === "hero";

  return (
    <article
      className={`relative w-full overflow-hidden rounded-3xl border text-center ${selectedStyle.card} ${
        hero
          ? "max-w-[560px] px-6 py-8 sm:px-10 sm:py-10"
          : "max-w-[460px] px-5 py-6 sm:px-8"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div
        className={`mx-auto flex items-center justify-center rounded-full border ${selectedStyle.avatar} ${
          hero
            ? "h-24 w-24 text-3xl sm:h-28 sm:w-28 sm:text-4xl"
            : "h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl"
        }`}
      >
        {participant
          ? getInitials(participant.team.name) || "P"
          : icon}
      </div>

      <div className="mt-5 flex justify-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${selectedStyle.badge}`}
        >
          <span>{icon}</span>
          {place}
        </span>
      </div>

      <h3
        className={`mt-3 font-black uppercase tracking-[0.08em] ${selectedStyle.accent} ${
          hero
            ? "text-xl sm:text-2xl"
            : "text-base sm:text-lg"
        }`}
      >
        {title}
      </h3>

      <p
        className={`mx-auto mt-3 truncate font-black text-white ${
          hero
            ? "max-w-[430px] text-2xl sm:text-3xl"
            : "max-w-[360px] text-lg sm:text-xl"
        }`}
      >
        {participant?.team.name ||
          "Por definir"}
      </p>

      {participant ? (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
          Seed #{participant.team.seed} · {participant.wins} victorias
        </p>
      ) : (
        <p className="mt-2 text-xs font-semibold text-neutral-600">
          Se actualizará al finalizar los partidos decisivos.
        </p>
      )}
    </article>
  );
}

function SidePlacementCard({
  participant,
  side,
  doubleElimination,
}: {
  participant: ParticipantStats | null;
  side: "left" | "right";
  doubleElimination: boolean;
}) {
  const defaultRank = side === "left" ? 3 : 4;
  const displayedRank =
    participant?.rank || defaultRank;

  const place = doubleElimination
    ? displayedRank === 3
      ? "3.er lugar"
      : `${displayedRank}.º lugar`
    : "3.º–4.º lugar";

  const title = doubleElimination
    ? displayedRank === 3
      ? "Tercer lugar"
      : "Cuarto lugar"
    : "Semifinalista";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/[0.07] via-[#101217] to-[#080a0d] p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent" />

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-400/[0.08] text-lg font-black text-orange-200">
          {participant
            ? getInitials(participant.team.name) || "P"
            : "🥉"}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300/70">
            {place}
          </p>

          <h3 className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-orange-200">
            {title}
          </h3>

          <p className="mt-2 truncate text-lg font-black text-white">
            {participant?.team.name ||
              "Por definir"}
          </p>
        </div>

        <span className="text-2xl opacity-80">
          🥉
        </span>
      </div>

      {participant ? (
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
          <MiniStat
            label="PJ"
            value={participant.played}
          />

          <MiniStat
            label="V"
            value={participant.wins}
            positive
          />

          <MiniStat
            label="D"
            value={participant.losses}
            negative
          />
        </div>
      ) : (
        <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs font-semibold text-neutral-600">
          La posición aparecerá cuando quede definida.
        </p>
      )}
    </article>
  );
}

function MiniStat({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-center">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-neutral-600">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          positive
            ? "text-emerald-400"
            : negative
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TableHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-600 sm:px-6 ${className}`}
    >
      {children}
    </th>
  );
}

function StatCell({
  value,
  positive = false,
  negative = false,
}: {
  value: number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <td
      className={`px-5 py-4 text-center text-sm font-black sm:px-6 ${
        positive
          ? "text-emerald-400"
          : negative
            ? "text-red-400"
            : "text-neutral-300"
      }`}
    >
      {value}
    </td>
  );
}