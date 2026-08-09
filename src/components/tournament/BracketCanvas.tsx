"use client";

import {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import TeamAvatar from "@/components/tournament/TeamAvatar";

import type {
  BracketMatch,
  BracketTeam,
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleBracketMatch,
  DoubleBracketRound,
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

const MATCH_WIDTH = 246;
const MATCH_HEIGHT = 138;

const ROUND_GAP = 82;
const SLOT_HEIGHT = 168;

const CHAMPION_WIDTH = 210;

const PAD_X = 8;
const PAD_Y = 22;

const HEADER_HEIGHT = 88;
const SECTION_HEADER_HEIGHT = 58;
const SECTION_GAP = 24;

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ActiveMatch =
  | BracketMatch
  | DoubleBracketMatch;

type ParticipantLogoMap =
  Record<string, string>;

type MatchPosition = {
  x: number;
  top: number;
  centerY: number;
};

type PositionMap = Record<
  string,
  MatchPosition
>;

type SectionLabel = {
  id: string;
  text: string;
  top: number;
};

type RoundHeader = {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  top: number;
  width: number;
  variant:
    | "winner"
    | "loser"
    | "final";
};

type ConnectionPath = {
  id: string;
  path: string;
  completed: boolean;
  variant:
    | "winner"
    | "loser"
    | "drop"
    | "final"
    | "champion";
};

type BracketLayout = {
  positions: PositionMap;
  headers: RoundHeader[];
  sectionLabels: SectionLabel[];

  visibleMatches: ActiveMatch[];

  championX: number;
  championY: number;

  width: number;
  height: number;
};

type DraggedParticipant = {
  teamId: string;
  matchId: string;
  position: 1 | 2;
};

type Props = {
  bracket: ActiveBracket;

  participantLogos?: ParticipantLogoMap;

  canManageResults?: boolean;

  onSelectWinner: (
    match: ActiveMatch,
    winnerId: string
  ) => void;

  onResetWinner: (
    matchId: string
  ) => void;

  canReorderParticipants?: boolean;

  onSwapInitialParticipants?: (
    sourceTeamId: string,
    targetTeamId: string
  ) => void;

  liveMatchId?: string | null;

  canManageLiveMatch?: boolean;

  updatingLiveMatch?: boolean;

  onToggleLiveMatch?: (
    match: ActiveMatch
  ) => void;
};

function normalizeParticipantKey(
  name: string
): string {
  return name
    .trim()
    .toLocaleLowerCase("es");
}

function getParticipantLogo(
  team: BracketTeam | null,
  participantLogos: ParticipantLogoMap
): string | null {
  if (!team) {
    return null;
  }

  return (
    participantLogos[
      normalizeParticipantKey(
        team.name
      )
    ] ?? null
  );
}

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

export default function BracketCanvas({
  bracket,
  participantLogos = {},
  canManageResults = true,
  onSelectWinner,
  onResetWinner,
  canReorderParticipants = false,
  onSwapInitialParticipants = () => undefined,
  liveMatchId = null,
  canManageLiveMatch = false,
  updatingLiveMatch = false,
  onToggleLiveMatch = () => undefined,
}: Props) {
  const scrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const dragState = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const [dragging, setDragging] =
    useState(false);

  const [
    draggedParticipantSlot,
    setDraggedParticipantSlot,
  ] = useState<DraggedParticipant | null>(
    null
  );

  const [
    hoveredParticipantSlot,
    setHoveredParticipantSlot,
  ] = useState<string | null>(null);

  const layout = useMemo(
    () =>
      isDoubleBracket(bracket)
        ? createDoubleBracketLayout(
            bracket
          )
        : createSingleBracketLayout(
            bracket
          ),
    [bracket]
  );

  const initialParticipantIds = useMemo(
    () => {
      const firstRound =
        isDoubleBracket(bracket)
          ? bracket.winnerRounds[0]
          : bracket.rounds[0];

      return new Set(
        (firstRound?.matches ?? [])
          .flatMap((match) => [
            match.team1?.id ?? null,
            match.team2?.id ?? null,
          ])
          .filter(
            (teamId): teamId is string =>
              Boolean(teamId)
          )
      );
    },
    [bracket]
  );

  const handlePointerDown = (
    event:
      ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const target =
      event.target as HTMLElement;

    const interactiveElement =
      target.closest(
        "button,input,select,a,textarea,label"
      );

    if (interactiveElement) {
      return;
    }

    const container =
      scrollRef.current;

    if (!container) {
      return;
    }

    dragState.current = {
      active: true,
      startX: event.clientX,
      startScroll:
        container.scrollLeft,
    };

    setDragging(true);

    container.setPointerCapture(
      event.pointerId
    );

    event.preventDefault();
  };

  const handlePointerMove = (
    event:
      ReactPointerEvent<HTMLDivElement>
  ) => {
    const container =
      scrollRef.current;

    if (
      !container ||
      !dragState.current.active
    ) {
      return;
    }

    const distance =
      event.clientX -
      dragState.current.startX;

    container.scrollLeft =
      dragState.current.startScroll -
      distance;

    event.preventDefault();
  };

  const handlePointerEnd = (
    event:
      ReactPointerEvent<HTMLDivElement>
  ) => {
    const container =
      scrollRef.current;

    dragState.current.active = false;

    setDragging(false);

    if (
      container?.hasPointerCapture(
        event.pointerId
      )
    ) {
      container.releasePointerCapture(
        event.pointerId
      );
    }
  };


  const getParticipantSlotKey = (
    matchId: string,
    position: 1 | 2
  ) => `${matchId}:${position}`;

  const handleParticipantDragStart = (
    event: ReactDragEvent<HTMLButtonElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam
  ) => {
    if (!canReorderParticipants) {
      event.preventDefault();
      return;
    }

    const slot: DraggedParticipant = {
      matchId: match.id,
      position,
      teamId: team.id,
    };

    setDraggedParticipantSlot(slot);
    setHoveredParticipantSlot(null);

    event.dataTransfer.effectAllowed =
      "move";
    event.dataTransfer.setData(
      "text/plain",
      getParticipantSlotKey(
        match.id,
        position
      )
    );
  };

  const handleParticipantDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam | null
  ) => {
    if (
      !canReorderParticipants ||
      !draggedParticipantSlot ||
      !team
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect =
      "move";

    setHoveredParticipantSlot(
      getParticipantSlotKey(
        match.id,
        position
      )
    );
  };

  const handleParticipantDrop = (
    event: ReactDragEvent<HTMLDivElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam | null
  ) => {
    event.preventDefault();

    const source =
      draggedParticipantSlot;

    setDraggedParticipantSlot(null);
    setHoveredParticipantSlot(null);

    if (
      !canReorderParticipants ||
      !source ||
      !team
    ) {
      return;
    }

    if (
      source.matchId === match.id &&
      source.position === position
    ) {
      return;
    }

    onSwapInitialParticipants(
      source.teamId,
      team.id
    );
  };

  const handleParticipantDragEnd = () => {
    setDraggedParticipantSlot(null);
    setHoveredParticipantSlot(null);
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={
        handlePointerDown
      }
      onPointerMove={
        handlePointerMove
      }
      onPointerUp={
        handlePointerEnd
      }
      onPointerCancel={
        handlePointerEnd
      }
      className={`relative overflow-auto select-none bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.10),transparent_32%),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:auto,28px_28px,28px_28px] ${
        dragging
          ? "cursor-grabbing"
          : "cursor-grab"
      }`}
    >
      <div
        className="relative"
        style={{
          width: layout.width,
          minWidth: layout.width,
          height: layout.height,
        }}
      >
        <SectionLabels
          labels={
            layout.sectionLabels
          }
        />

        <RoundHeaders
          headers={layout.headers}
        />

        <BracketConnections
          bracket={bracket}
          positions={
            layout.positions
          }
          visibleMatches={
            layout.visibleMatches
          }
          championX={
            layout.championX
          }
          championY={
            layout.championY
          }
        />

        {layout.visibleMatches.map(
          (match) => {
            const position =
              layout.positions[
                match.id
              ];

            if (!position) {
              return null;
            }

            return (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: position.x,
                  top: position.top,
                  width: MATCH_WIDTH,
                  height: MATCH_HEIGHT,
                }}
              >
                <MatchCard
                  match={match}
                  participantLogos={
                    participantLogos
                  }
                  canManageResults={
                    canManageResults
                  }
                  onSelectWinner={
                    onSelectWinner
                  }
                  onResetWinner={
                    onResetWinner
                  }
                  canReorderParticipants={
                    canReorderParticipants
                  }
                  initialParticipantIds={
                    initialParticipantIds
                  }
                  draggedParticipantSlot={
                    draggedParticipantSlot
                  }
                  hoveredParticipantSlot={
                    hoveredParticipantSlot
                  }
                  onParticipantDragStart={
                    handleParticipantDragStart
                  }
                  onParticipantDragOver={
                    handleParticipantDragOver
                  }
                  onParticipantDrop={
                    handleParticipantDrop
                  }
                  onParticipantDragEnd={
                    handleParticipantDragEnd
                  }
                  liveMatchId={
                    liveMatchId
                  }
                  canManageLiveMatch={
                    canManageLiveMatch
                  }
                  updatingLiveMatch={
                    updatingLiveMatch
                  }
                  onToggleLiveMatch={
                    onToggleLiveMatch
                  }
                />
              </div>
            );
          }
        )}

        <div
          className="absolute"
          style={{
            left: layout.championX,
            top:
              layout.championY -
              112,
            width: CHAMPION_WIDTH,
          }}
        >
          {isDoubleBracket(
            bracket
          ) ? (
            <DoubleChampionCard
              bracket={bracket}
              participantLogos={
                participantLogos
              }
            />
          ) : (
            <SingleChampionCard
              bracket={bracket}
              participantLogos={
                participantLogos
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function createSingleBracketLayout(
  bracket: TournamentBracket
): BracketLayout {
  const positions: PositionMap =
    {};

  const firstRoundMatches =
    bracket.rounds[0]?.matches
      .length || 1;

  const contentHeight =
    firstRoundMatches *
    SLOT_HEIGHT;

  const height = Math.max(
    650,
    contentHeight +
      PAD_Y * 2 +
      HEADER_HEIGHT
  );

  const headers: RoundHeader[] =
    [];

  bracket.rounds.forEach(
    (round, roundIndex) => {
      const x =
        PAD_X +
        roundIndex *
          (MATCH_WIDTH +
            ROUND_GAP);

      headers.push({
        id: round.id,
        name: round.name,
        subtitle: `RONDA ${
          roundIndex + 1
        }`,
        x,
        top: 0,
        width: MATCH_WIDTH,
        variant: "winner",
      });

      round.matches.forEach(
        (
          match,
          matchIndex
        ) => {
          let centerY: number;

          if (roundIndex === 0) {
            centerY =
              HEADER_HEIGHT +
              PAD_Y +
              SLOT_HEIGHT / 2 +
              matchIndex *
                SLOT_HEIGHT;
          } else {
            const previousRound =
              bracket.rounds[
                roundIndex - 1
              ];

            const firstPrevious =
              previousRound.matches[
                matchIndex * 2
              ];

            const secondPrevious =
              previousRound.matches[
                matchIndex * 2 + 1
              ];

            const firstPosition =
              firstPrevious
                ? positions[
                    firstPrevious.id
                  ]
                : null;

            const secondPosition =
              secondPrevious
                ? positions[
                    secondPrevious.id
                  ]
                : null;

            centerY =
              firstPosition &&
              secondPosition
                ? (firstPosition.centerY +
                    secondPosition.centerY) /
                  2
                : HEADER_HEIGHT +
                  PAD_Y +
                  contentHeight /
                    2;
          }

          
          positions[match.id] = {
            x,
            centerY,
            top:
              centerY -
              MATCH_HEIGHT / 2,
          };
        }
      );
    }
  );

  const championX =
    PAD_X +
    bracket.rounds.length *
      (MATCH_WIDTH + ROUND_GAP);

  const finalRound =
    bracket.rounds[
      bracket.rounds.length - 1
    ];

  const finalMatch =
    finalRound?.matches[0];

  const championY =
    finalMatch &&
    positions[finalMatch.id]
      ? positions[finalMatch.id]
          .centerY
      : height / 2;

  headers.push({
    id: "single-champion",
    name: "CAMPEÓN",
    subtitle: "GANADOR",
    x: championX,
    top: 0,
    width: CHAMPION_WIDTH,
    variant: "final",
  });

  const visibleMatches =
    bracket.rounds
      .flatMap(
        (round) =>
          round.matches
      )
      .filter((match) => {
        if (
          match.roundIndex > 0
        ) {
          return true;
        }

        const teamCount =
          Number(
            Boolean(match.team1)
          ) +
          Number(
            Boolean(match.team2)
          );

        return teamCount === 2;
      });

  const width =
    championX +
    CHAMPION_WIDTH +
    PAD_X;

  return {
    positions,
    headers,
    sectionLabels: [],
    visibleMatches,
    championX,
    championY,
    height,
    width,
  };
}

function createDoubleBracketLayout(
  bracket: DoubleTournamentBracket
): BracketLayout {
  const positions: PositionMap =
    {};

  const headers: RoundHeader[] =
    [];

  const sectionLabels:
    SectionLabel[] = [];

  const visibleMatches:
    ActiveMatch[] = [];

const winnerFirstRound =
  bracket.winnerRounds[0];

/**
 * El Winner Bracket conserva siempre la cantidad original
 * de espacios de la primera ronda. Aunque un BYE se oculte
 * visualmente, su espacio virtual sigue existiendo para que
 * las rondas posteriores no se compriman ni se superpongan.
 */
const winnerFirstRoundSlotCount =
  Math.max(
    1,
    winnerFirstRound?.matches.length ?? 0
  );

const winnerContentHeight =
  Math.max(
    SLOT_HEIGHT,
    winnerFirstRoundSlotCount *
      SLOT_HEIGHT
  );

  const winnerTop =
    SECTION_HEADER_HEIGHT +
    HEADER_HEIGHT;

  const winnerSectionHeight =
    winnerContentHeight +
    PAD_Y * 2;

  const loserTop =
    winnerTop +
    winnerSectionHeight +
    SECTION_GAP +
    SECTION_HEADER_HEIGHT +
    HEADER_HEIGHT;

  const loserFirstRoundCount =
    bracket.loserRounds[0]
      ?.matches.length || 1;

  const loserContentHeight =
    Math.max(
      SLOT_HEIGHT,
      loserFirstRoundCount *
        SLOT_HEIGHT
    );

  const loserSectionHeight =
    loserContentHeight +
    PAD_Y * 2;

  sectionLabels.push({
    id: "winner-section",
    text: "WINNER BRACKET",
    top: 0,
  });

  sectionLabels.push({
    id: "loser-section",
    text: "LOSER BRACKET",
    top:
      winnerTop +
      winnerSectionHeight +
      SECTION_GAP,
  });

  layoutDoubleRounds({
    rounds:
      bracket.winnerRounds,
    positions,
    headers,
    visibleMatches,
    sectionTop: winnerTop,
    sectionHeaderTop:
      SECTION_HEADER_HEIGHT,
    variant: "winner",
  });

  layoutDoubleRounds({
    rounds:
      bracket.loserRounds,
    positions,
    headers,
    visibleMatches,
    sectionTop: loserTop,
    sectionHeaderTop:
      loserTop -
      HEADER_HEIGHT,
    variant: "loser",
  });

  const largestRoundCount =
    Math.max(
      bracket.winnerRounds.length,
      bracket.loserRounds.length
    );

const grandFinalX =
  PAD_X +
  largestRoundCount *
    (MATCH_WIDTH + ROUND_GAP) -
  80;

const championX =
  grandFinalX +
  MATCH_WIDTH +
  ROUND_GAP;

  const finalsCenterY =
    winnerTop +
    winnerSectionHeight / 2;

  if (bracket.grandFinal) {
  const resetFinalIsActive =
    Boolean(
      bracket.resetFinal?.team1 &&
      bracket.resetFinal?.team2
    ) ||
    Boolean(
      bracket.resetFinal?.completed
    );

  const grandFinalCenterY =
    resetFinalIsActive
      ? finalsCenterY - 92
      : finalsCenterY;

  positions[
    bracket.grandFinal.id
  ] = {
    x: grandFinalX,
    centerY: grandFinalCenterY,
    top:
      grandFinalCenterY -
      MATCH_HEIGHT / 2,
  };

  visibleMatches.push(
    bracket.grandFinal
  );

  headers.push({
    id: "grand-final-header",
    name: "GRAN FINAL",
    subtitle:
      resetFinalIsActive
        ? "RESET ACTIVO"
        : "WINNER VS LOSER",
    x: grandFinalX,
    top: SECTION_HEADER_HEIGHT,
    width: MATCH_WIDTH,
    variant: "final",
  });

  if (
    bracket.resetFinal &&
    resetFinalIsActive
  ) {
    const resetFinalCenterY =
      finalsCenterY + 92;

    positions[
      bracket.resetFinal.id
    ] = {
      x: grandFinalX,
      centerY:
        resetFinalCenterY,
      top:
        resetFinalCenterY -
        MATCH_HEIGHT / 2,
    };

    visibleMatches.push(
      bracket.resetFinal
    );
  }
}

const resetFinalIsActive =
  Boolean(
    bracket.resetFinal?.team1 &&
    bracket.resetFinal?.team2
  ) ||
  Boolean(
    bracket.resetFinal?.completed
  );

const championY =
  resetFinalIsActive &&
  bracket.resetFinal
    ? positions[
        bracket.resetFinal.id
      ]?.centerY ??
      finalsCenterY
    : bracket.grandFinal
      ? positions[
          bracket.grandFinal.id
        ]?.centerY ??
        finalsCenterY
      : finalsCenterY;

  headers.push({
    id: "double-champion",
    name: "CAMPEÓN",
    subtitle: "GANADOR FINAL",
    x: championX,
    top: SECTION_HEADER_HEIGHT,
    width: CHAMPION_WIDTH,
    variant: "final",
  });

  const width =
    championX +
    CHAMPION_WIDTH +
    PAD_X;

  const height =
    loserTop +
    loserSectionHeight +
    PAD_Y +
    50;

  return {
    positions,
    headers,
    sectionLabels,
    visibleMatches,
    championX,
    championY,
    width,
    height,
  };
}

function layoutDoubleRounds({
  rounds,
  positions,
  headers,
  visibleMatches,
  sectionTop,
  sectionHeaderTop,
  variant,
}: {
  rounds: DoubleBracketRound[];

  positions: PositionMap;

  headers: RoundHeader[];

  visibleMatches: ActiveMatch[];

  sectionTop: number;

  sectionHeaderTop: number;

  variant:
    | "winner"
    | "loser";
}) {
  const firstRound =
    rounds[0];

  /**
   * El alto se calcula con todos los espacios originales de
   * la primera ronda, no solo con los partidos visibles.
   * Esto mantiene intacta la geometría del fixture cuando se
   * elimina un participante y su encuentro pasa a ser BYE.
   */
  const firstRoundSlotCount =
    Math.max(
      1,
      firstRound?.matches.length ?? 0
    );

  const contentHeight =
    firstRoundSlotCount *
    SLOT_HEIGHT;

  rounds.forEach(
    (round, roundIndex) => {
      const x =
        PAD_X +
        roundIndex *
          (MATCH_WIDTH +
            ROUND_GAP);

      headers.push({
        id: `${variant}-${round.id}`,
        name: round.name,
        subtitle: `RONDA ${
          roundIndex + 1
        }`,
        x,
        top: sectionHeaderTop,
        width: MATCH_WIDTH,
        variant,
      });

      if (roundIndex === 0) {
        /**
         * Cada partido conserva su posición original según
         * matchIndex. Los BYEs pueden ocultarse como tarjeta,
         * pero nunca pierden su espacio virtual dentro de la
         * llave. Así los cruces posteriores permanecen en su
         * lugar y no se superponen.
         */
        for (const match of round.matches) {
          const isHiddenBye =
            variant === "winner" &&
            match.automaticAdvance &&
            Number(Boolean(match.team1)) +
              Number(Boolean(match.team2)) <
              2;

          const centerY =
            sectionTop +
            PAD_Y +
            SLOT_HEIGHT / 2 +
            match.matchIndex *
              SLOT_HEIGHT;

          positions[match.id] = {
            x,
            centerY,
            top:
              centerY -
              MATCH_HEIGHT / 2,
          };

          if (!isHiddenBye) {
            visibleMatches.push(match);
          }
        }

        return;
      }

      round.matches.forEach(
        (
          match,
          matchIndex
        ) => {
          const previousRound =
            rounds[
              roundIndex - 1
            ];

          const sameMatchCount =
            previousRound.matches.length ===
            round.matches.length;

          let centerY: number;

          /**
           * En las rondas del Loser Bracket que conservan
           * la misma cantidad de partidos, cada encuentro
           * continúa alineado con el partido anterior
           * que ocupa el mismo índice.
           */
          if (
            variant === "loser" &&
            sameMatchCount
          ) {
            const previousMatch =
              previousRound.matches[
                matchIndex
              ];

            const previousPosition =
              previousMatch
                ? positions[
                    previousMatch.id
                  ]
                : null;

            if (previousPosition) {
              centerY =
                previousPosition.centerY;
            } else {
              const spacing =
                contentHeight /
                Math.max(
                  1,
                  round.matches.length
                );

              centerY =
                sectionTop +
                spacing / 2 +
                matchIndex *
                  spacing;
            }
          } else {
            /**
             * Cuando la ronda reduce su cantidad de partidos,
             * dos encuentros anteriores alimentan uno nuevo.
             */
            const firstPrevious =
              previousRound.matches[
                matchIndex * 2
              ];

            const secondPrevious =
              previousRound.matches[
                matchIndex * 2 + 1
              ];

            const firstPosition =
              firstPrevious
                ? positions[
                    firstPrevious.id
                  ]
                : null;

            const secondPosition =
              secondPrevious
                ? positions[
                    secondPrevious.id
                  ]
                : null;

            if (
              firstPosition &&
              secondPosition
            ) {
              centerY =
                (
                  firstPosition.centerY +
                  secondPosition.centerY
                ) / 2;
            } else if (firstPosition) {
              centerY =
                firstPosition.centerY;
            } else if (secondPosition) {
              centerY =
                secondPosition.centerY;
            } else {
              const spacing =
                contentHeight /
                Math.max(
                  1,
                  round.matches.length
                );

              centerY =
                sectionTop +
                spacing / 2 +
                matchIndex *
                  spacing;
            }
          }

          positions[match.id] = {
            x,
            centerY,
            top:
              centerY -
              MATCH_HEIGHT / 2,
          };

          visibleMatches.push(match);
        }
      );
    }
  );
}

function SectionLabels({
  labels,
}: {
  labels: SectionLabel[];
}) {
  return (
    <>
      {labels.map((label) => (
        <div
          key={label.id}
          className="absolute left-0 flex h-[58px] items-center border-b border-white/10 bg-black/25 px-7"
          style={{
            top: label.top,
            width: "100%",
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                label.id ===
                "winner-section"
                  ? "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]"
                  : "bg-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.8)]"
              }`}
            />

            <p className="text-sm font-black tracking-[0.22em] text-white">
              {label.text}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}

function RoundHeaders({
  headers,
}: {
  headers: RoundHeader[];
}) {
  return (
    <>
      {headers.map((header) => (
        <div
          key={header.id}
          className={`absolute flex h-[82px] flex-col items-center justify-center border-b text-center ${
            header.variant ===
            "winner"
              ? "border-red-500/25"
              : header.variant ===
                  "loser"
                ? "border-violet-500/25"
                : "border-yellow-500/30"
          }`}
          style={{
            left: header.x,
            top: header.top,
            width: header.width,
          }}
        >
          <p
            className={`text-sm font-black uppercase tracking-wide ${
              header.variant ===
              "winner"
                ? "text-red-200"
                : header.variant ===
                    "loser"
                  ? "text-violet-200"
                  : "text-yellow-300"
            }`}
          >
            {header.name}
          </p>

          <p
            className={`mt-2 text-[10px] font-black tracking-[0.18em] ${
              header.variant ===
              "winner"
                ? "text-red-500/70"
                : header.variant ===
                    "loser"
                  ? "text-violet-500/70"
                  : "text-yellow-600"
            }`}
          >
            {header.subtitle}
          </p>
        </div>
      ))}
    </>
  );
}

function BracketConnections({
  bracket,
  positions,
  visibleMatches,
  championX,
  championY,
}: {
  bracket: ActiveBracket;

  positions: PositionMap;

  visibleMatches: ActiveMatch[];

  championX: number;

  championY: number;
}) {
  const visibleMatchIds = new Set(
    visibleMatches.map(
      (match) => match.id
    )
  );

  const paths =
    isDoubleBracket(bracket)
      ? createDoubleConnections(
          bracket,
          positions,
          visibleMatchIds,
          championX,
          championY
        )
      : createSingleConnections(
          bracket,
          positions,
          visibleMatchIds,
          championX
        );

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {paths.map(
        (connection) => (
          <path
            key={connection.id}
            d={connection.path}
            fill="none"
            stroke={getConnectionColor(
              connection
            )}
            strokeWidth={
              connection.completed
                ? 2
                : 1.5
            }
            strokeDasharray={
              connection.variant ===
              "drop"
                ? "6 5"
                : undefined
            }
          />
        )
      )}
    </svg>
  );
}

function createSingleConnections(
  bracket: TournamentBracket,
  positions: PositionMap,
  visibleMatchIds: Set<string>,
  championX: number
): ConnectionPath[] {
  const paths:
    ConnectionPath[] = [];

  bracket.rounds.forEach(
    (round) => {
      round.matches.forEach(
        (match) => {
          if (
            !match.nextMatchId ||
            !visibleMatchIds.has(
              match.id
            )
          ) {
            return;
          }

          const isHiddenBye =
            match.roundIndex === 0 &&
            Number(
              Boolean(match.team1)
            ) +
              Number(
                Boolean(match.team2)
              ) <
              2;

          if (isHiddenBye) {
            return;
          }

          const source =
            positions[match.id];

          const destination =
            positions[
              match.nextMatchId
            ];

          if (
            !source ||
            !destination
          ) {
            return;
          }

          paths.push({
            id: `${match.id}-${match.nextMatchId}`,
            completed:
              match.completed,
            variant: "winner",
            path: createStandardPath(
              source,
              destination
            ),
          });
        }
      );
    }
  );

  const finalRound =
    bracket.rounds[
      bracket.rounds.length - 1
    ];

  const finalMatch =
    finalRound?.matches[0];

  if (
    finalMatch &&
    positions[finalMatch.id]
  ) {
    const source =
      positions[finalMatch.id];

    paths.push({
      id: "single-champion",
      completed: Boolean(
        bracket.champion
      ),
      variant: "champion",
      path: [
        `M ${
          source.x +
          MATCH_WIDTH
        } ${source.centerY}`,
        `H ${championX}`,
      ].join(" "),
    });
  }

  return paths;
}

function createDoubleConnections(
  bracket: DoubleTournamentBracket,
  positions: PositionMap,
  visibleMatchIds: Set<string>,
  championX: number,
  championY: number
): ConnectionPath[] {
  const paths:
    ConnectionPath[] = [];

  for (
    const round of
    bracket.winnerRounds
  ) {
    for (
      const match of
      round.matches
    ) {
      addDoubleMatchConnections({
        paths,
        positions,
        visibleMatchIds,
        match,
      });
    }
  }

  for (
    const round of
    bracket.loserRounds
  ) {
    for (
      const match of
      round.matches
    ) {
      addDoubleMatchConnections({
        paths,
        positions,
        visibleMatchIds,
        match,
      });
    }
  }

  if (bracket.grandFinal) {
    addDoubleMatchConnections({
      paths,
      positions,
      visibleMatchIds,
      match:
        bracket.grandFinal,
    });
  }

const championSource =
  bracket.grandFinal;
  
  if (
    championSource &&
    positions[
      championSource.id
    ]
  ) {
    const source =
      positions[
        championSource.id
      ];

    paths.push({
      id: "double-champion",
      completed: Boolean(
        bracket.champion
      ),
      variant: "champion",
      path: [
        `M ${
          source.x +
          MATCH_WIDTH
        } ${source.centerY}`,
        `H ${
          source.x +
          MATCH_WIDTH +
          30
        }`,
        `V ${championY}`,
        `H ${championX}`,
      ].join(" "),
    });
  }

  return paths;
}

function addDoubleMatchConnections({
  paths,
  positions,
  visibleMatchIds,
  match,
}: {
  paths: ConnectionPath[];

  positions: PositionMap;

  visibleMatchIds: Set<string>;

  match: DoubleBracketMatch;
}) {
  const source =
    positions[match.id];

  if (
    !source ||
    !visibleMatchIds.has(
      match.id
    )
  ) {
    return;
  }

  const participantCount =
    Number(Boolean(match.team1)) +
    Number(Boolean(match.team2));

  /**
   * En el Winner Bracket los BYEs de primera ronda se
   * mantienen como posiciones virtuales para conservar la
   * geometría, pero su tarjeta está oculta. No dibujamos
   * conexiones desde una tarjeta invisible porque producen
   * líneas largas y aparentemente desconectadas.
   */
  const isHiddenWinnerBye =
    match.section === "winner" &&
    match.automaticAdvance &&
    participantCount < 2;

  if (isHiddenWinnerBye) {
    return;
  }

  /**
   * Un BYE vacío del Loser Bracket cierra una ruta sin
   * ganador. Por tanto, tampoco debe dibujar una línea hacia
   * la siguiente ronda. Un BYE con un participante sí conserva
   * su conexión porque ese jugador avanza automáticamente.
   */
  const hasWinnerToAdvance =
    !match.automaticAdvance ||
    participantCount === 1;

  if (
    hasWinnerToAdvance &&
    match.nextMatchId
  ) {
    const destination =
      positions[
        match.nextMatchId
      ];

    if (destination) {
      paths.push({
        id: `${match.id}-winner-${match.nextMatchId}`,
        completed:
          match.completed,
        variant:
          match.section ===
          "loser"
            ? "loser"
            : match.section ===
                  "grand-final"
              ? "final"
              : "winner",
        path: createStandardPath(
          source,
          destination
        ),
      });
    }
  }

  /**
   * Solo un partido real con dos participantes puede producir
   * un perdedor. Los BYEs nunca envían equipos al Loser Bracket.
   */
  if (
    match.section === "winner" &&
    !match.automaticAdvance &&
    participantCount === 2 &&
    match.loserNextMatchId
  ) {
    const loserDestination =
      positions[
        match.loserNextMatchId
      ];

    if (loserDestination) {
      paths.push({
        id: `${match.id}-loser-${match.loserNextMatchId}`,
        completed:
          match.completed,
        variant: "drop",
        path: createDropPath(
          source,
          loserDestination
        ),
      });
    }
  }
}

function createStandardPath(
  source: MatchPosition,
  destination: MatchPosition
): string {
  const startX =
    source.x + MATCH_WIDTH;

  const middleX =
    startX +
    (destination.x -
      startX) /
      2;

  return [
    `M ${startX} ${source.centerY}`,
    `H ${middleX}`,
    `V ${destination.centerY}`,
    `H ${destination.x}`,
  ].join(" ");
}

function createDropPath(
  source: MatchPosition,
  destination: MatchPosition
): string {
  const startX =
    source.x + MATCH_WIDTH;

  const offsetX =
    Math.max(
      28,
      (destination.x -
        startX) /
        2
    );

  const middleX =
    startX + offsetX;

  return [
    `M ${startX} ${source.centerY}`,
    `H ${middleX}`,
    `V ${destination.centerY}`,
    `H ${destination.x}`,
  ].join(" ");
}

function getConnectionColor(
  connection: ConnectionPath
): string {
  if (!connection.completed) {
    if (
      connection.variant ===
      "drop"
    ) {
      return "rgba(167,139,250,0.28)";
    }

    return "rgba(148,163,184,0.34)";
  }

  if (
    connection.variant ===
    "champion"
  ) {
    return "rgba(250,204,21,0.95)";
  }

  if (
    connection.variant ===
    "loser" ||
    connection.variant ===
    "drop"
  ) {
    return "rgba(139,92,246,0.90)";
  }

  if (
    connection.variant ===
    "final"
  ) {
    return "rgba(250,204,21,0.88)";
  }

  return "rgba(239,68,68,0.95)";
}

function ParticipantAvatar({
  team,
  winner = false,
  size = "medium",
  participantLogos,
}: {
  team: BracketTeam | null;
  winner?: boolean;
  size?: "small" | "medium" | "large";
  participantLogos: ParticipantLogoMap;
}) {
  const logoUrl =
    getParticipantLogo(
      team,
      participantLogos
    );

  const [
    failedLogoUrl,
    setFailedLogoUrl,
  ] = useState<string | null>(
    null
  );

  if (
    !team ||
    !logoUrl ||
    failedLogoUrl === logoUrl
  ) {
    return (
      <TeamAvatar
        team={team}
        winner={winner}
        size={size}
      />
    );
  }

  const sizeClasses = {
    small:
      "h-8 w-8",
    medium:
      "h-12 w-12",
    large:
      "h-20 w-20",
  } as const;

  return (
    <div
      title={team.name}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-[#111923] transition-all duration-300 hover:scale-110 ${sizeClasses[size]} ${
        winner
          ? "border-yellow-300/80 ring-2 ring-yellow-500/20"
          : "border-white/25"
      }`}
    >
      <img
        src={logoUrl}
        alt={`Logo de ${team.name}`}
        className="h-full w-full object-cover"
        draggable={false}
        onError={() => {
          setFailedLogoUrl(
            logoUrl
          );
        }}
      />
    </div>
  );
}

function MatchCard({
  match,
  participantLogos,
  canManageResults,
  onSelectWinner,
  onResetWinner,
  canReorderParticipants,
  initialParticipantIds,
  draggedParticipantSlot,
  hoveredParticipantSlot,
  onParticipantDragStart,
  onParticipantDragOver,
  onParticipantDrop,
  onParticipantDragEnd,
  liveMatchId,
  canManageLiveMatch,
  updatingLiveMatch,
  onToggleLiveMatch,
}: {
  match: ActiveMatch;

  participantLogos: ParticipantLogoMap;

  canManageResults: boolean;

  onSelectWinner: (
    match: ActiveMatch,
    winnerId: string
  ) => void;

  onResetWinner: (
    matchId: string
  ) => void;

  canReorderParticipants: boolean;

  initialParticipantIds: Set<string>;

  draggedParticipantSlot:
    DraggedParticipant | null;

  hoveredParticipantSlot:
    string | null;

  onParticipantDragStart: (
    event: ReactDragEvent<HTMLButtonElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam
  ) => void;

  onParticipantDragOver: (
    event: ReactDragEvent<HTMLDivElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam | null
  ) => void;

  onParticipantDrop: (
    event: ReactDragEvent<HTMLDivElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam | null
  ) => void;

  onParticipantDragEnd: () => void;

  liveMatchId: string | null;

  canManageLiveMatch: boolean;

  updatingLiveMatch: boolean;

  onToggleLiveMatch: (
    match: ActiveMatch
  ) => void;
}) {
  const playable = Boolean(
    match.team1 &&
      match.team2
  );

  const automaticAdvance =
    isDoubleMatch(match) &&
    match.automaticAdvance;

  const canReorderTeam1 =
    canReorderParticipants &&
    Boolean(
      match.team1 &&
        initialParticipantIds.has(
          match.team1.id
        )
    );

  const canReorderTeam2 =
    canReorderParticipants &&
    Boolean(
      match.team2 &&
        initialParticipantIds.has(
          match.team2.id
        )
    );

  const section =
    isDoubleMatch(match)
      ? match.section
      : "winner";

  const isLiveMatch =
    liveMatchId === match.id;

  const canToggleLiveMatch =
    canManageLiveMatch &&
    playable &&
    !automaticAdvance &&
    (!match.completed || isLiveMatch);

  const borderClass =
    isLiveMatch
      ? "border-red-400 shadow-[0_0_28px_rgba(239,68,68,0.28)]"
      : match.completed
      ? section === "loser"
        ? "border-violet-500/45"
        : section ===
              "grand-final" ||
            section ===
              "reset-final"
          ? "border-yellow-500/45"
          : "border-red-500/45"
      : playable
        ? "border-white/20 hover:border-red-500/45"
        : "border-white/15";

  const accentClass =
    isLiveMatch
      ? "bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.95)]"
      : match.completed
      ? section === "loser"
        ? "bg-violet-500"
        : section ===
              "grand-final" ||
            section ===
              "reset-final"
          ? "bg-yellow-500"
          : "bg-red-500"
      : playable
        ? "bg-yellow-600/80"
        : "bg-gray-600";

  return (
    <article
      className={`relative h-full overflow-hidden rounded-xl border bg-gradient-to-br from-[#0b1219] via-[#101822] to-[#141f2b] shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(239,68,68,0.20)] ${borderClass}`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-[3px] ${accentClass}`}
      />

      <div className="flex h-[28px] items-center justify-between border-b border-white/10 bg-black/30 px-3">
        <span className="text-[9px] font-black text-gray-300">
          MATCH #
          {match.matchIndex + 1}
        </span>

        <div className="flex items-center gap-2">
          {canToggleLiveMatch && (
            <button
              type="button"
              onClick={() =>
                onToggleLiveMatch(
                  match
                )
              }
              disabled={
                updatingLiveMatch
              }
              title={
                isLiveMatch
                  ? "Quitar de transmisión"
                  : "Transmitir este partido"
              }
              className={`rounded-md border px-2 py-1 text-[8px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isLiveMatch
                  ? "border-red-400/50 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                  : "border-blue-400/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
              }`}
            >
              {isLiveMatch
                ? "✕ QUITAR"
                : "📺 STREAM"}
            </button>
          )}

          <MatchStatus
            match={match}
            playable={playable}
            live={isLiveMatch}
          />
        </div>
      </div>

      <TeamRow
        match={match}
        team={match.team1}
        participantLogos={
          participantLogos
        }
        canManageResults={
          canManageResults
        }
        score={match.score1}
        winner={
          match.winnerId ===
          match.team1?.id
        }
        onSelectWinner={
          onSelectWinner
        }
        position={1}
        canReorder={
          canReorderTeam1
        }
        draggedParticipantSlot={
          draggedParticipantSlot
        }
        hoveredParticipantSlot={
          hoveredParticipantSlot
        }
        onParticipantDragStart={
          onParticipantDragStart
        }
        onParticipantDragOver={
          onParticipantDragOver
        }
        onParticipantDrop={
          onParticipantDrop
        }
        onParticipantDragEnd={
          onParticipantDragEnd
        }
      />

      <div className="mx-3 h-px bg-white/10" />

      <TeamRow
        match={match}
        team={match.team2}
        participantLogos={
          participantLogos
        }
        canManageResults={
          canManageResults
        }
        score={match.score2}
        winner={
          match.winnerId ===
          match.team2?.id
        }
        onSelectWinner={
          onSelectWinner
        }
        position={2}
        canReorder={
          canReorderTeam2
        }
        draggedParticipantSlot={
          draggedParticipantSlot
        }
        hoveredParticipantSlot={
          hoveredParticipantSlot
        }
        onParticipantDragStart={
          onParticipantDragStart
        }
        onParticipantDragOver={
          onParticipantDragOver
        }
        onParticipantDrop={
          onParticipantDrop
        }
        onParticipantDragEnd={
          onParticipantDragEnd
        }
      />

      {match.completed ? (
        automaticAdvance ? (
          <div className="absolute bottom-0 left-0 flex h-[20px] w-full items-center justify-center border-t border-white/10 bg-amber-950/30 text-[8px] font-black text-amber-300">
            AVANCE AUTOMÁTICO POR BYE
          </div>
        ) : canManageResults ? (
          <button
            type="button"
            onClick={() =>
              onResetWinner(
                match.id
              )
            }
            className="absolute bottom-0 left-0 h-[20px] w-full border-t border-white/10 bg-red-950/30 text-[8px] font-black text-red-300 transition hover:bg-red-900/45"
          >
            CORREGIR RESULTADO
          </button>
        ) : (
          <div className="absolute bottom-0 left-0 flex h-[20px] w-full items-center justify-center border-t border-white/10 bg-black/20 text-[8px] font-black text-gray-500">
            RESULTADO REGISTRADO
          </div>
        )
      ) : (
        <div className="absolute bottom-0 left-0 flex h-[20px] w-full items-center justify-center border-t border-white/10 bg-black/20 text-[8px] font-black text-gray-500">
          {playable
            ? canManageResults
              ? "CLIC EN EL EQUIPO GANADOR"
              : "PARTIDO PENDIENTE"
            : "ESPERANDO GANADORES"}
        </div>
      )}
    </article>
  );
}

function TeamRow({
  match,
  team,
  participantLogos,
  canManageResults,
  score,
  winner,
  onSelectWinner,
  position,
  canReorder,
  draggedParticipantSlot,
  hoveredParticipantSlot,
  onParticipantDragStart,
  onParticipantDragOver,
  onParticipantDrop,
  onParticipantDragEnd,
}: {
  match: ActiveMatch;

  team: BracketTeam | null;

  participantLogos: ParticipantLogoMap;

  canManageResults: boolean;

  score: number;

  winner: boolean;

  onSelectWinner: (
    match: ActiveMatch,
    winnerId: string
  ) => void;

  position: 1 | 2;

  canReorder: boolean;

  draggedParticipantSlot:
    DraggedParticipant | null;

  hoveredParticipantSlot:
    string | null;

  onParticipantDragStart: (
    event: ReactDragEvent<HTMLButtonElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam
  ) => void;

  onParticipantDragOver: (
    event: ReactDragEvent<HTMLDivElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam | null
  ) => void;

  onParticipantDrop: (
    event: ReactDragEvent<HTMLDivElement>,
    match: ActiveMatch,
    position: 1 | 2,
    team: BracketTeam | null
  ) => void;

  onParticipantDragEnd: () => void;
}) {
  const disabled =
    !canManageResults ||
    !team ||
    (isDoubleMatch(match) &&
      match.automaticAdvance);

  const slotKey =
    `${match.id}:${position}`;

  const isDraggingThisParticipant =
    Boolean(
      draggedParticipantSlot &&
        draggedParticipantSlot.matchId ===
          match.id &&
        draggedParticipantSlot.position ===
          position
    );

  const isDropTarget =
    canReorder &&
    Boolean(team) &&
    Boolean(draggedParticipantSlot) &&
    !isDraggingThisParticipant &&
    hoveredParticipantSlot ===
      slotKey;

  return (
    <div
      onDragOver={(event) =>
        onParticipantDragOver(
          event,
          match,
          position,
          team
        )
      }
      onDrop={(event) =>
        onParticipantDrop(
          event,
          match,
          position,
          team
        )
      }
      className={`flex h-[44px] items-center transition ${
        isDropTarget
          ? "bg-red-500/15 ring-1 ring-inset ring-red-400/70"
          : isDraggingThisParticipant
            ? "opacity-45"
            : winner
              ? "bg-gradient-to-r from-red-500/15 to-transparent"
              : disabled
                ? "bg-white/[0.015]"
                : ""
      }`}
    >
      {canReorder && team && (
        <button
          type="button"
          draggable
          onDragStart={(event) =>
            onParticipantDragStart(
              event,
              match,
              position,
              team
            )
          }
          onDragEnd={
            onParticipantDragEnd
          }
          onClick={(event) => {
            event.stopPropagation();
          }}
          title="Arrastrar participante"
          aria-label={`Mover ${team.name}`}
          className="ml-1 flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[11px] font-black tracking-[-0.22em] text-gray-500 transition hover:bg-white/10 hover:text-gray-200 active:cursor-grabbing"
        >
          ⋮⋮
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (team) {
            onSelectWinner(
              match,
              team.id
            );
          }
        }}
        className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <ParticipantAvatar
          team={team}
          winner={winner}
          size="small"
          participantLogos={
            participantLogos
          }
        />

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[12px] font-black ${
              !team
                ? "text-gray-300"
                : winner
                  ? "text-white"
                  : "text-gray-200"
            }`}
          >
            {team?.name ||
              "Ganador pendiente"}
          </p>

          <p className="mt-0.5 text-[8px] font-bold text-gray-500">
            {!team
              ? "POR DEFINIR"
              : canManageResults
                ? `SEED #${team.seed} · CLIC PARA ELEGIR`
                : `SEED #${team.seed}`}
          </p>
        </div>

        {winner && (
          <span className="text-green-400">
            ✓
          </span>
        )}
      </button>

      <div
        className={`flex h-full w-[42px] items-center justify-center border-l border-white/10 bg-black/30 text-[15px] font-black ${
          winner
            ? "text-green-300"
            : !team
              ? "text-gray-500"
              : "text-white"
        }`}
      >
        {Number.isFinite(score)
          ? score
          : 0}
      </div>
    </div>
  );
}

function MatchStatus({
  match,
  playable,
  live,
}: {
  match: ActiveMatch;
  playable: boolean;
  live: boolean;
}) {
  const automaticAdvance =
    isDoubleMatch(match) &&
    match.automaticAdvance;

  const text = live
    ? "EN VIVO"
    : automaticAdvance
      ? "BYE"
    : match.completed
      ? "FINALIZADO"
      : playable
        ? "PENDIENTE"
        : "BLOQUEADO";

  const color = live
    ? "text-red-300"
    : automaticAdvance
      ? "text-amber-400"
    : match.completed
      ? "text-green-400"
      : playable
        ? "text-yellow-400"
        : "text-gray-400";

  return (
    <span
      className={`text-[9px] font-black ${color}`}
    >
      {text}
    </span>
  );
}

function SingleChampionCard({
  bracket,
  participantLogos,
}: {
  bracket: TournamentBracket;
  participantLogos: ParticipantLogoMap;
}) {
  const champion =
    bracket.champion;

  return (
    <article
      className={`overflow-hidden rounded-2xl border shadow-[0_18px_50px_rgba(0,0,0,0.5)] ${
        champion
          ? "border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-[#101822] to-[#080d13]"
          : "border-white/15 bg-[#0a1017]"
      }`}
    >
      <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-center">
        <p className="text-[10px] font-black tracking-[0.22em] text-yellow-500">
          CAMPEÓN
        </p>
      </div>

      <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-6 text-center">
        {champion ? (
          <ParticipantAvatar
            team={champion}
            winner
            size="large"
            participantLogos={
              participantLogos
            }
          />
        ) : (
          <div className="text-4xl">
            🏆
          </div>
        )}

        <h3
          className={`mt-4 max-w-full truncate text-lg font-black ${
            champion
              ? "text-yellow-200"
              : "text-gray-400"
          }`}
        >
          {champion?.name ??
            "Aún no definido"}
        </h3>

        <p className="mt-2 text-[9px] font-black tracking-[0.16em] text-gray-500">
          {champion
            ? "GANADOR DEL TORNEO"
            : "ESPERANDO LA FINAL"}
        </p>
      </div>
    </article>
  );
}

function DoubleChampionCard({
  bracket,
  participantLogos,
}: {
  bracket: DoubleTournamentBracket;
  participantLogos: ParticipantLogoMap;
}) {
  const champion =
    bracket.champion;

  return (
    <article className="overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-[#101822] to-[#080d13] shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
      <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-center">
        <p className="text-[10px] font-black tracking-[0.22em] text-yellow-500">
          CAMPEÓN
        </p>
      </div>

      <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-6 text-center">
        <ParticipantAvatar
          team={champion}
          winner={Boolean(champion)}
          size="large"
          participantLogos={
            participantLogos
          }
        />

        <h3
          className={`mt-4 max-w-full truncate text-lg font-black ${
            champion
              ? "text-yellow-200"
              : "text-gray-400"
          }`}
        >
          {champion?.name ??
            "Aún no definido"}
        </h3>

        <p className="mt-2 text-[9px] font-black tracking-[0.16em] text-gray-500">
          {champion
            ? "GANADOR DEL TORNEO"
            : "ESPERANDO LAS FINALES"}
        </p>
      </div>
    </article>
  );
}