"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TeamAvatar from "@/components/tournament/TeamAvatar";

import type {
  BracketMatch,
  TournamentBracket,
} from "@/lib/bracket";

import type {
  DoubleBracketMatch,
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ActiveMatch =
  | BracketMatch
  | DoubleBracketMatch;

type StreamPlatform =
  | "youtube"
  | "twitch"
  | "kick"
  | "unsupported";

type StreamInfo = {
  platform: StreamPlatform;
  embedUrl: string | null;
  displayName: string;
};

type StreamTabProps = {
  tournamentId: string;
  tournamentName: string;
  streamUrl: string | null;
  bracket: ActiveBracket;
  liveMatchId: string | null;
  isTournamentOwner: boolean;
  updatingLiveMatch: boolean;
  onClearLiveMatch: () => void;
  onGoToBracket: () => void;
};

const TWITCH_RESERVED_PATHS = new Set([
  "directory",
  "downloads",
  "jobs",
  "p",
  "search",
  "settings",
  "subscriptions",
  "videos",
  "wallet",
]);

const KICK_RESERVED_PATHS = new Set([
  "browse",
  "categories",
  "dashboard",
  "following",
  "search",
  "settings",
  "videos",
]);

function isDoubleBracket(
  bracket: ActiveBracket
): bracket is DoubleTournamentBracket {
  return (
    "winnerRounds" in bracket &&
    "loserRounds" in bracket
  );
}

function getAllMatches(
  bracket: ActiveBracket
): ActiveMatch[] {
  if (!isDoubleBracket(bracket)) {
    return bracket.rounds.flatMap(
      (round) => round.matches
    );
  }

  const matches: ActiveMatch[] = [
    ...bracket.winnerRounds.flatMap(
      (round) => round.matches
    ),
    ...bracket.loserRounds.flatMap(
      (round) => round.matches
    ),
  ];

  if (bracket.grandFinal) {
    matches.push(bracket.grandFinal);
  }

  if (bracket.resetFinal) {
    matches.push(bracket.resetFinal);
  }

  return matches;
}

function getMatchLabel(
  match: ActiveMatch
): string {
  if (!("section" in match)) {
    return match.roundName;
  }

  if (match.section === "winner") {
    return `${match.roundName} · Winner Bracket`;
  }

  if (match.section === "loser") {
    return `${match.roundName} · Loser Bracket`;
  }

  if (match.section === "grand-final") {
    return "Gran Final";
  }

  return "Final de reinicio";
}

function getYouTubeVideoId(
  url: URL
): string | null {
  const host = url.hostname
    .toLowerCase()
    .replace(/^www\./, "");

  if (host === "youtu.be") {
    return url.pathname
      .split("/")
      .filter(Boolean)[0] ?? null;
  }

  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com"
  ) {
    return null;
  }

  const pathParts = url.pathname
    .split("/")
    .filter(Boolean);

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  if (
    ["embed", "live", "shorts"].includes(
      pathParts[0] ?? ""
    )
  ) {
    return pathParts[1] ?? null;
  }

  return null;
}

function getChannelFromPath(
  url: URL,
  reservedPaths: Set<string>
): string | null {
  const firstPath = url.pathname
    .split("/")
    .filter(Boolean)[0]
    ?.trim();

  if (
    !firstPath ||
    reservedPaths.has(
      firstPath.toLowerCase()
    )
  ) {
    return null;
  }

  return firstPath;
}

function createStreamInfo(
  streamUrl: string | null,
  parentDomain: string,
  origin: string
): StreamInfo | null {
  const normalizedUrl =
    streamUrl?.trim();

  if (!normalizedUrl) {
    return null;
  }

  try {
    const url = new URL(normalizedUrl);
    const host = url.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const youtubeVideoId =
      getYouTubeVideoId(url);

    if (youtubeVideoId) {
      const originParameter = origin
        ? `&origin=${encodeURIComponent(
            origin
          )}`
        : "";

      return {
        platform: "youtube",
        embedUrl:
          `https://www.youtube.com/embed/${encodeURIComponent(
            youtubeVideoId
          )}?autoplay=1&mute=1&playsinline=1&rel=0${originParameter}`,
        displayName: "YouTube",
      };
    }

    if (
      host === "twitch.tv" ||
      host === "m.twitch.tv" ||
      host === "player.twitch.tv"
    ) {
      const channel =
        url.searchParams.get("channel") ??
        getChannelFromPath(
          url,
          TWITCH_RESERVED_PATHS
        );

      if (channel && parentDomain) {
        return {
          platform: "twitch",
          embedUrl:
            `https://player.twitch.tv/?channel=${encodeURIComponent(
              channel
            )}&parent=${encodeURIComponent(
              parentDomain
            )}&autoplay=true&muted=true`,
          displayName: `Twitch · ${channel}`,
        };
      }
    }

    if (
      host === "kick.com" ||
      host === "player.kick.com"
    ) {
      const channel = getChannelFromPath(
        url,
        KICK_RESERVED_PATHS
      );

      if (channel) {
        return {
          platform: "kick",
          embedUrl:
            `https://player.kick.com/${encodeURIComponent(
              channel
            )}?autoplay=true&muted=true`,
          displayName: `KICK · ${channel}`,
        };
      }
    }

    const pathName = url.pathname
      .split("/")
      .filter(Boolean)[0];

    return {
      platform: "unsupported",
      embedUrl: null,
      displayName: pathName
        ? `${host} · ${pathName}`
        : host,
    };
  } catch {
    return {
      platform: "unsupported",
      embedUrl: null,
      displayName: "Transmisión oficial",
    };
  }
}

export default function StreamTab({
  tournamentId,
  tournamentName,
  streamUrl,
  bracket,
  liveMatchId,
  isTournamentOwner,
  updatingLiveMatch,
  onClearLiveMatch,
  onGoToBracket,
}: StreamTabProps) {
  const [parentDomain, setParentDomain] =
    useState("localhost");

  const [origin, setOrigin] =
    useState("");

  useEffect(() => {
    setParentDomain(
      window.location.hostname ||
        "localhost"
    );

    setOrigin(
      window.location.origin
    );
  }, []);

  const allMatches = useMemo(
    () => getAllMatches(bracket),
    [bracket]
  );

  const liveMatch = useMemo(
    () =>
      liveMatchId
        ? allMatches.find(
            (match) =>
              match.id === liveMatchId
          ) ?? null
        : null,
    [allMatches, liveMatchId]
  );

  const upcomingMatches = useMemo(
    () =>
      allMatches
        .filter(
          (match) =>
            match.id !== liveMatchId &&
            !match.completed &&
            Boolean(
              match.team1 && match.team2
            )
        )
        .slice(0, 3),
    [allMatches, liveMatchId]
  );

  const streamInfo = useMemo(
    () =>
      createStreamInfo(
        streamUrl,
        parentDomain,
        origin
      ),
    [streamUrl, parentDomain, origin]
  );

  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#090f16] shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
            <div className="border-b border-white/10 bg-black/25 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    Partido destacado
                  </p>

                  <h2 className="mt-2 text-lg font-black text-white">
                    {liveMatch
                      ? "Ahora en transmisión"
                      : "Sin partido seleccionado"}
                  </h2>
                </div>

                {liveMatch && (
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black text-red-300">
                    ● EN VIVO
                  </span>
                )}
              </div>
            </div>

            {liveMatch ? (
              <div className="p-5">
                <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  {getMatchLabel(liveMatch)}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                    <TeamAvatar
                      team={liveMatch.team1}
                      size="small"
                    />

                    <p className="min-w-0 flex-1 truncate text-sm font-black text-white">
                      {liveMatch.team1?.name ??
                        "Participante por definir"}
                    </p>
                  </div>

                  <div className="text-center text-xs font-black text-red-400">
                    VS
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                    <TeamAvatar
                      team={liveMatch.team2}
                      size="small"
                    />

                    <p className="min-w-0 flex-1 truncate text-sm font-black text-white">
                      {liveMatch.team2?.name ??
                        "Participante por definir"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onGoToBracket}
                  className="mt-5 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                >
                  VER PARTIDO EN EL FIXTURE
                </button>

                {isTournamentOwner && (
                  <button
                    type="button"
                    onClick={onClearLiveMatch}
                    disabled={updatingLiveMatch}
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-xs font-black text-red-300 transition hover:border-red-400/45 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingLiveMatch
                      ? "ACTUALIZANDO..."
                      : "QUITAR DE TRANSMISIÓN"}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm leading-7 text-neutral-400">
                  El administrador todavía no marcó qué partido está mostrando el stream oficial.
                </p>

                {isTournamentOwner && (
                  <button
                    type="button"
                    onClick={onGoToBracket}
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white transition hover:bg-red-500"
                  >
                    SELECCIONAR PARTIDO EN EL FIXTURE
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#090f16] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
              Próximas partidas
            </p>

            <div className="mt-4 space-y-3">
              {upcomingMatches.length > 0 ? (
                upcomingMatches.map(
                  (match) => (
                    <div
                      key={match.id}
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-600">
                        {getMatchLabel(match)}
                      </p>

                      <p className="mt-2 truncate text-xs font-bold text-neutral-300">
                        {match.team1?.name} vs {match.team2?.name}
                      </p>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-neutral-500">
                  No hay otros partidos definidos por ahora.
                </p>
              )}
            </div>
          </section>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#070c12] shadow-[0_22px_75px_rgba(0,0,0,0.48)]">
          <div className="flex flex-col gap-4 border-b border-white/10 bg-black/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                ● Transmisión oficial
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                {tournamentName}
              </h2>
            </div>

            {streamUrl && streamInfo && (
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-neutral-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                {streamInfo.displayName} ↗
              </a>
            )}
          </div>

          {streamInfo?.embedUrl ? (
            <div className="aspect-video min-h-[300px] w-full bg-black">
              <iframe
                key={streamInfo.embedUrl}
                src={streamInfo.embedUrl}
                title={`Transmisión oficial de ${tournamentName}`}
                className="h-full w-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl">
                📺
              </div>

              <h3 className="mt-5 text-xl font-black text-white">
                {!streamUrl
                  ? "Este torneo todavía no tiene un stream oficial"
                  : "Este enlace no se puede reproducir dentro de la página"}
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-500">
                {!streamUrl
                  ? "Agrega un enlace de YouTube, Twitch o KICK desde la información del torneo."
                  : "Puedes abrir la transmisión original mientras se agrega compatibilidad para esa plataforma."}
              </p>

              {streamUrl ? (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:bg-red-500"
                >
                  ABRIR TRANSMISIÓN
                </a>
              ) : isTournamentOwner ? (
                <Link
                  href={`/tournaments/${tournamentId}/edit`}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:bg-red-500"
                >
                  AGREGAR STREAM OFICIAL
                </Link>
              ) : null}
            </div>
          )}

          {streamUrl && (
            <div className="border-t border-white/10 bg-black/25 px-5 py-4">
              <p className="text-xs text-neutral-500">
                Transmitido desde{" "}
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-red-300 transition hover:text-red-200"
                >
                  {streamInfo?.displayName ??
                    "el canal oficial"}
                </a>
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}