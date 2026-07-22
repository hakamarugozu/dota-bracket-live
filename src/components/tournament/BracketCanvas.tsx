"use client";

import {
  PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import ChampionCard from "@/components/tournament/ChampionCard";
import TeamAvatar from "@/components/tournament/TeamAvatar";
import {
  BracketMatch,
  BracketTeam,
  TournamentBracket,
} from "../../../lib/bracket";

const MATCH_WIDTH = 246;
const MATCH_HEIGHT = 138;
const ROUND_GAP = 82;
const SLOT_HEIGHT = 168;
const CHAMPION_WIDTH = 210;
const PAD_X = 28;
const PAD_Y = 22;

type MatchPosition = {
  x: number;
  top: number;
  centerY: number;
};

type PositionMap = Record<string, MatchPosition>;

export default function BracketCanvas({
  bracket,
  onSelectWinner,
  onResetWinner,
}: {
  bracket: TournamentBracket;
  onSelectWinner: (match: BracketMatch, winnerId: string) => void;
  onResetWinner: (matchId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const dragState = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const [dragging, setDragging] = useState(false);

  const layout = useMemo(() => createBracketLayout(bracket), [bracket]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;

    const interactiveElement = target.closest(
      "button,input,select,a,textarea,label",
    );

    if (interactiveElement) {
      return;
    }

    const container = scrollRef.current;

    if (!container) {
      return;
    }

    dragState.current = {
      active: true,
      startX: event.clientX,
      startScroll: container.scrollLeft,
    };

    setDragging(true);

    container.setPointerCapture(event.pointerId);

    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;

    if (!container || !dragState.current.active) {
      return;
    }

    const distance = event.clientX - dragState.current.startX;

    container.scrollLeft = dragState.current.startScroll - distance;

    event.preventDefault();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;

    dragState.current.active = false;
    setDragging(false);

    if (container?.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`relative overflow-auto select-none bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.10),transparent_32%),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:auto,28px_28px,28px_28px] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
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
        <RoundHeaders bracket={bracket} championX={layout.championX} />

        <BracketConnections
          bracket={bracket}
          positions={layout.positions}
          championX={layout.championX}
        />

        {bracket.rounds
          .flatMap((round) => round.matches)
          .map((match) => {
            const position = layout.positions[match.id];

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
                  onSelectWinner={onSelectWinner}
                  onResetWinner={onResetWinner}
                />
              </div>
            );
          })}

        <div
          className="absolute"
          style={{
            left: layout.championX,
            top: layout.championY - 112,
            width: CHAMPION_WIDTH,
          }}
        >
          <ChampionCard bracket={bracket} />
        </div>
      </div>
    </div>
  );
}

function createBracketLayout(bracket: TournamentBracket) {
  const positions: PositionMap = {};

  const firstRoundMatches = bracket.rounds[0]?.matches.length || 1;

  const contentHeight = firstRoundMatches * SLOT_HEIGHT;

  const height = Math.max(650, contentHeight + PAD_Y * 2 + 76);

  bracket.rounds.forEach((round, roundIndex) => {
    const x = PAD_X + roundIndex * (MATCH_WIDTH + ROUND_GAP);

    round.matches.forEach((match, matchIndex) => {
      let centerY: number;

      if (roundIndex === 0) {
        centerY = 88 + PAD_Y + SLOT_HEIGHT / 2 + matchIndex * SLOT_HEIGHT;
      } else {
        const previousRound = bracket.rounds[roundIndex - 1];

        const firstPrevious = previousRound.matches[matchIndex * 2];

        const secondPrevious = previousRound.matches[matchIndex * 2 + 1];

        const firstPosition = firstPrevious
          ? positions[firstPrevious.id]
          : null;

        const secondPosition = secondPrevious
          ? positions[secondPrevious.id]
          : null;

        centerY =
          firstPosition && secondPosition
            ? (firstPosition.centerY + secondPosition.centerY) / 2
            : 88 + PAD_Y + contentHeight / 2;
      }

      positions[match.id] = {
        x,
        centerY,
        top: centerY - MATCH_HEIGHT / 2,
      };
    });
  });

  const championX = PAD_X + bracket.rounds.length * (MATCH_WIDTH + ROUND_GAP);

  const finalRound = bracket.rounds[bracket.rounds.length - 1];

  const finalMatch = finalRound?.matches[0];

  const championY =
    finalMatch && positions[finalMatch.id]
      ? positions[finalMatch.id].centerY
      : height / 2;

  const width = championX + CHAMPION_WIDTH + PAD_X;

  return {
    positions,
    championX,
    championY,
    height,
    width,
  };
}

function RoundHeaders({
  bracket,
  championX,
}: {
  bracket: TournamentBracket;
  championX: number;
}) {
  return (
    <>
      {bracket.rounds.map((round, index) => {
        const x = PAD_X + index * (MATCH_WIDTH + ROUND_GAP);

        return (
          <div
            key={round.id}
            className="absolute top-0 flex h-[82px] flex-col items-center justify-center border-b border-white/15 text-center"
            style={{
              left: x,
              width: MATCH_WIDTH,
            }}
          >
            <p className="text-sm font-black uppercase tracking-wide text-gray-100">
              {round.name}
            </p>

            <p className="mt-2 text-[10px] font-black tracking-[0.18em] text-gray-400">
              RONDA {index + 1}
            </p>
          </div>
        );
      })}

      <div
        className="absolute top-0 flex h-[82px] flex-col items-center justify-center border-b border-yellow-500/30 text-center"
        style={{
          left: championX,
          width: CHAMPION_WIDTH,
        }}
      >
        <p className="text-sm font-black text-yellow-300">CAMPEÓN</p>

        <p className="mt-2 text-[10px] font-black tracking-[0.18em] text-yellow-600">
          GANADOR
        </p>
      </div>
    </>
  );
}

function BracketConnections({
  bracket,
  positions,
  championX,
}: {
  bracket: TournamentBracket;
  positions: PositionMap;
  championX: number;
}) {
  const paths: {
    id: string;
    path: string;
    completed: boolean;
    champion?: boolean;
  }[] = [];

  bracket.rounds.forEach((round) => {
    round.matches.forEach((match) => {
      if (!match.nextMatchId) {
        return;
      }

      const source = positions[match.id];

      const destination = positions[match.nextMatchId];

      if (!source || !destination) {
        return;
      }

      const startX = source.x + MATCH_WIDTH;

      const middleX = startX + (destination.x - startX) / 2;

      paths.push({
        id: `${match.id}-${match.nextMatchId}`,
        completed: match.completed,
        path: [
          `M ${startX} ${source.centerY}`,
          `H ${middleX}`,
          `V ${destination.centerY}`,
          `H ${destination.x}`,
        ].join(" "),
      });
    });
  });

  const finalRound = bracket.rounds[bracket.rounds.length - 1];

  const finalMatch = finalRound?.matches[0];

  if (finalMatch && positions[finalMatch.id]) {
    const source = positions[finalMatch.id];

    paths.push({
      id: "champion",
      completed: Boolean(bracket.champion),
      champion: true,
      path: [
        `M ${source.x + MATCH_WIDTH} ${source.centerY}`,
        `H ${championX}`,
      ].join(" "),
    });
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {paths.map((connection) => (
        <path
          key={connection.id}
          d={connection.path}
          fill="none"
          stroke={
            connection.completed
              ? connection.champion
                ? "rgba(250,204,21,0.95)"
                : "rgba(239,68,68,0.95)"
              : "rgba(148,163,184,0.42)"
          }
          strokeWidth={connection.completed ? 2 : 1.5}
        />
      ))}
    </svg>
  );
}

function MatchCard({
  match,
  onSelectWinner,
  onResetWinner,
}: {
  match: BracketMatch;
  onSelectWinner: (match: BracketMatch, winnerId: string) => void;
  onResetWinner: (matchId: string) => void;
}) {
  const playable = Boolean(match.team1 && match.team2);

  return (
    <article
  className={`relative h-full overflow-hidden rounded-xl border
bg-gradient-to-br from-[#0b1219] via-[#101822] to-[#141f2b]
backdrop-blur-sm
shadow-[0_10px_35px_rgba(0,0,0,0.45)]
transition-all duration-300 ease-out
hover:-translate-y-1
hover:scale-[1.02]
hover:shadow-[0_0_30px_rgba(239,68,68,0.20)]
${
  match.completed
    ? "border-red-500/45"
    : playable
      ? "border-white/20 hover:border-red-500/45"
      : "border-white/15"
}`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-[3px] ${
          match.completed
            ? "bg-red-500"
            : playable
              ? "bg-yellow-600/80"
              : "bg-gray-600"
        }`}
      />

      <div className="flex h-[28px] items-center justify-between border-b border-white/10 bg-black/30 px-3">
        <span className="text-[9px] font-black text-gray-300">
          MATCH #{match.matchIndex + 1}
        </span>

        <MatchStatus match={match} playable={playable} />
      </div>

      <TeamRow
        match={match}
        team={match.team1}
        score={match.score1}
        winner={match.winnerId === match.team1?.id}
        onSelectWinner={onSelectWinner}
      />

      <div className="mx-3 h-px bg-white/10" />

      <TeamRow
        match={match}
        team={match.team2}
        score={match.score2}
        winner={match.winnerId === match.team2?.id}
        onSelectWinner={onSelectWinner}
      />

      {match.completed ? (
        <button
          type="button"
          onClick={() => onResetWinner(match.id)}
          className="absolute bottom-0 left-0 h-[20px] w-full border-t border-white/10 bg-red-950/30 text-[8px] font-black text-red-300 transition hover:bg-red-900/45"
        >
          CORREGIR RESULTADO
        </button>
      ) : (
        <div className="absolute bottom-0 left-0 flex h-[20px] w-full items-center justify-center border-t border-white/10 bg-black/20 text-[8px] font-black text-gray-500">
          {playable ? "CLIC EN EL EQUIPO GANADOR" : "ESPERANDO GANADORES"}
        </div>
      )}
    </article>
  );
}

function TeamRow({
  match,
  team,
  score,
  winner,
  onSelectWinner,
}: {
  match: BracketMatch;
  team: BracketTeam | null;
  score: number;
  winner: boolean;
  onSelectWinner: (match: BracketMatch, winnerId: string) => void;
}) {
  const disabled = !team;

  return (
    <div
      className={`flex h-[44px] items-center ${
        winner
          ? "bg-gradient-to-r from-red-500/15 to-transparent"
          : disabled
            ? "bg-white/[0.015]"
            : ""
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (team) {
            onSelectWinner(match, team.id);
          }
        }}
        className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <TeamAvatar team={team} winner={winner} size="small" />

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[12px] font-black ${
              disabled
                ? "text-gray-300"
                : winner
                  ? "text-white"
                  : "text-gray-200"
            }`}
          >
            {team?.name || "Ganador pendiente"}
          </p>

          <p className="mt-0.5 text-[8px] font-bold text-gray-500">
            {disabled ? "POR DEFINIR" : `SEED #${team.seed} · CLIC PARA ELEGIR`}
          </p>
        </div>

        {winner && <span className="text-green-400">✓</span>}
      </button>

      <div
        className={`flex h-full w-[42px] items-center justify-center border-l border-white/10 bg-black/30 text-[15px] font-black ${
          winner ? "text-green-300" : disabled ? "text-gray-500" : "text-white"
        }`}
      >
        {Number.isFinite(score) ? score : 0}
      </div>
    </div>
  );
}

function MatchStatus({
  match,
  playable,
}: {
  match: BracketMatch;
  playable: boolean;
}) {
  const text = match.completed
    ? "FINALIZADO"
    : playable
      ? "PENDIENTE"
      : "BLOQUEADO";

  const color = match.completed
    ? "text-green-400"
    : playable
      ? "text-yellow-400"
      : "text-gray-400";

  return <span className={`text-[9px] font-black ${color}`}>{text}</span>;
}