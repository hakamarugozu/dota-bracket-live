"use client";

import { useState } from "react";

import TeamAvatar from "@/components/tournament/TeamAvatar";

import type {
  BracketMatch,
  BracketTeam,
} from "@/lib/bracket";

const QUICK_RESULTS = [
  [1, 0],
  [2, 0],
  [2, 1],
  [3, 0],
  [3, 1],
  [3, 2],
] as const;

type ParticipantLogoMap =
  Record<string, string>;

type Props = {
  match: BracketMatch;
  winner: BracketTeam;
  participantLogos?: ParticipantLogoMap;
  winnerScore: number;
  loserScore: number;
  onWinnerScoreChange: (
    value: number
  ) => void;
  onLoserScoreChange: (
    value: number
  ) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

function normalizeParticipantKey(
  name: string
): string {
  return name
    .trim()
    .toLocaleLowerCase("es");
}

export default function ResultModal({
  match,
  winner,
  participantLogos = {},
  winnerScore,
  loserScore,
  onWinnerScoreChange,
  onLoserScoreChange,
  onCancel,
  onConfirm,
}: Props) {
  const loser =
    match.team1?.id === winner.id
      ? match.team2
      : match.team1;

  const validResult =
    winnerScore > loserScore &&
    winnerScore >= 1 &&
    loserScore >= 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/30 bg-[#0b1219] shadow-[0_30px_100px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/25 px-5 py-4">
          <div>
            <p className="text-[9px] font-black tracking-[0.18em] text-red-400">
              REGISTRAR RESULTADO
            </p>

            <h3 className="mt-1 text-lg font-black">
              ¿Con qué resultado ganó?
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-500 transition hover:bg-white/5 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
            <DialogTeam
              team={winner}
              participantLogos={
                participantLogos
              }
              winner
            />

            <span className="text-sm font-black text-gray-600">
              VS
            </span>

            <DialogTeam
              team={loser}
              participantLogos={
                participantLogos
              }
            />
          </div>

          <p className="mt-5 text-[10px] font-black tracking-[0.16em] text-gray-500">
            RESULTADOS RÁPIDOS
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {QUICK_RESULTS.map(
              ([winnerResult, loserResult]) => {
                const selected =
                  winnerScore ===
                    winnerResult &&
                  loserScore ===
                    loserResult;

                return (
                  <button
                    type="button"
                    key={`${winnerResult}-${loserResult}`}
                    onClick={() => {
                      onWinnerScoreChange(
                        winnerResult
                      );

                      onLoserScoreChange(
                        loserResult
                      );
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-black transition ${
                      selected
                        ? "border-red-400 bg-red-500/20 text-white shadow-[0_0_18px_rgba(239,68,68,0.18)]"
                        : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-red-500/30 hover:text-white"
                    }`}
                  >
                    {winnerResult}-
                    {loserResult}
                  </button>
                );
              }
            )}
          </div>

          <p className="mt-5 text-[10px] font-black tracking-[0.16em] text-gray-500">
            RESULTADO PERSONALIZADO
          </p>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ScoreInput
              label={winner.name}
              value={winnerScore}
              onChange={
                onWinnerScoreChange
              }
              winner
            />

            <span className="pt-5 text-xl font-black text-gray-600">
              -
            </span>

            <ScoreInput
              label={
                loser?.name || "Rival"
              }
              value={loserScore}
              onChange={
                onLoserScoreChange
              }
            />
          </div>

          {!validResult && (
            <p className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs font-bold text-yellow-300">
              El ganador debe tener un
              marcador superior al rival.
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              CANCELAR
            </button>

            <button
              type="button"
              disabled={!validResult}
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-600"
            >
              CONFIRMAR GANADOR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DialogTeam({
  team,
  participantLogos,
  winner = false,
}: {
  team: BracketTeam | null;
  participantLogos: ParticipantLogoMap;
  winner?: boolean;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="flex justify-center">
        <ParticipantAvatar
          team={team}
          participantLogos={
            participantLogos
          }
          winner={winner}
        />
      </div>

      <p
        className={`mt-2 truncate text-xs font-black ${
          winner
            ? "text-white"
            : "text-gray-400"
        }`}
      >
        {team?.name ||
          "Rival pendiente"}
      </p>

      {winner && (
        <p className="mt-1 text-[8px] font-black tracking-wide text-red-400">
          GANADOR
        </p>
      )}
    </div>
  );
}

function ParticipantAvatar({
  team,
  participantLogos,
  winner,
}: {
  team: BracketTeam | null;
  participantLogos: ParticipantLogoMap;
  winner: boolean;
}) {
  const [failedLogoUrl, setFailedLogoUrl] =
    useState<string | null>(null);

  const logoUrl = team
    ? participantLogos[
        normalizeParticipantKey(
          team.name
        )
      ] ?? ""
    : "";

  if (
    !team ||
    !logoUrl ||
    failedLogoUrl === logoUrl
  ) {
    return (
      <TeamAvatar
        team={team}
        winner={winner}
        size="medium"
      />
    );
  }

  return (
    <div
      title={team.name}
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-[#111923] transition-all duration-300 hover:scale-110 ${
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

function ScoreInput({
  label,
  value,
  onChange,
  winner = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  winner?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span
        className={`block truncate text-center text-[9px] font-black ${
          winner
            ? "text-red-300"
            : "text-gray-500"
        }`}
      >
        {label}
      </span>

      <input
        type="number"
        min={0}
        value={
          Number.isFinite(value)
            ? value
            : 0
        }
        onChange={(event) => {
          const nextValue = Math.max(
            0,
            Math.floor(
              Number(
                event.target.value
              ) || 0
            )
          );

          onChange(nextValue);
        }}
        className={`mt-2 h-14 w-full rounded-xl border bg-black/30 text-center text-2xl font-black outline-none transition ${
          winner
            ? "border-red-500/35 text-white focus:border-red-400"
            : "border-white/10 text-gray-300 focus:border-white/25"
        }`}
      />
    </label>
  );
}