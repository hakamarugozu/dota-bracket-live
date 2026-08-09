"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getTournament,
  updateTournamentLiveMatch,
} from "@/lib/tournaments";
import { getTeams } from "@/lib/teams";
import { supabase } from "@/lib/supabase";

import {
  getBracket,
  saveBracket as saveBracketToSupabase,
} from "@/lib/bracketStorage";

import {
  generateBracket,
  resetMatchWinner,
  setMatchResultAndAdvance,
} from "@/lib/bracket";

import type {
  BracketMatch,
  BracketTeam,
  Tournament,
  TournamentBracket,
} from "@/lib/bracket";

import {
  calculateChampion,
  generateDoubleBracket,
  resetDoubleMatchWinner,
  setDoubleMatchResultAndAdvance,
} from "@/lib/double-bracket";

import type {
  DoubleBracketMatch,
  DoubleTournamentBracket,
} from "@/lib/double-bracket";

import {
  repairDoubleBracketConsistency,
} from "@/lib/double-bracket/reset";
import {
  propagateAutomaticByes,
} from "@/lib/double-bracket/advance";

import ResultModal from "@/components/tournament/ResultModal";
import BracketCanvas from "@/components/tournament/BracketCanvas";
import TeamsTab from "@/components/tournament/TeamsTab";
import ClassificationTab from "@/components/tournament/ClassificationTab";
import RulesTab from "@/components/tournament/RulesTab";
import LoadingScreen from "@/components/tournament/LoadingScreen";
import EmptyTournament from "@/components/tournament/EmptyTournament";
import ChampionPanel from "@/components/tournament/ChampionPanel";
import ProgressPanel from "@/components/tournament/ProgressPanel";
import InformationPanel from "@/components/tournament/InformationPanel";
import InstructionsPanel from "@/components/tournament/InstructionsPanel";
import TournamentHero from "@/components/tournament/TournamentHero";
import TournamentNavigation from "@/components/tournament/TournamentNavigation";
import Toast from "@/components/tournament/Toast";
import Footer from "@/components/tournament/Footer";
import Header from "@/components/tournament/Header";
import MatchesTab from "@/components/tournament/MatchesTab";
import StreamTab from "@/components/tournament/StreamTab";

type TournamentFormat =
  | "single"
  | "double";

type TournamentWithFormat =
  Tournament & {
    format: string;
    stream: string | null;
    status: string | null;
    mode: "team" | "individual" | null;
    organization: string | null;
  };

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ActiveMatch =
  | BracketMatch
  | DoubleBracketMatch;

type ParticipantLogoMap =
  Record<string, string>;

type ResultDialog =
  | {
      match: ActiveMatch;
      winner: BracketTeam;
    }
  | null;

type Props = {
  tournamentId: string;
};

function normalizeParticipantKey(
  name: string
): string {
  return name
    .trim()
    .toLocaleLowerCase("es");
}

/**
 * Normaliza los diferentes valores que pueden
 * representar la eliminación doble en Supabase.
 */
function normalizeTournamentFormat(
  format: string | null | undefined
): TournamentFormat {
  const normalized =
    String(format ?? "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");

  if (
    normalized === "double" ||
    normalized === "double-elimination" ||
    normalized === "eliminacion-doble" ||
    normalized === "eliminación-doble"
  ) {
    return "double";
  }

  return "single";
}

function isTournamentFinished(
  status: string | null | undefined
): boolean {
  return (
    String(status ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") ===
    "finalizado"
  );
}

/**
 * Comprueba si un bracket pertenece al motor
 * de doble eliminación.
 */
function isDoubleBracket(
  bracket: ActiveBracket
): bracket is DoubleTournamentBracket {
  return (
    "winnerRounds" in bracket &&
    "loserRounds" in bracket
  );
}

/**
 * Comprueba si un partido pertenece al motor
 * de doble eliminación.
 */
function isDoubleMatch(
  match: ActiveMatch
): match is DoubleBracketMatch {
  return (
    "section" in match &&
    "loserNextMatchId" in match
  );
}


type BracketWithPositionLock =
  ActiveBracket & {
    positionsLocked?: boolean;
  };

function bracketHasRealResult(
  bracket: ActiveBracket
): boolean {
  const matches: ActiveMatch[] =
    isDoubleBracket(bracket)
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
          ...(bracket.resetFinal
            ? [bracket.resetFinal]
            : []),
        ]
      : bracket.rounds.flatMap(
          (round) => round.matches
        );

  return matches.some((match) => {
    if (
      !match.completed ||
      !match.team1 ||
      !match.team2
    ) {
      return false;
    }

    if (
      isDoubleMatch(match) &&
      match.automaticAdvance
    ) {
      return false;
    }

    return true;
  });
}

function bracketPositionsAreLocked(
  bracket: ActiveBracket
): boolean {
  return Boolean(
    (bracket as BracketWithPositionLock)
      .positionsLocked
  );
}

function lockBracketPositions<T extends ActiveBracket>(
  bracket: T
): T {
  return {
    ...bracket,
    positionsLocked: true,
  } as T;
}

type InitialParticipantSlot = {
  match: ActiveMatch;
  position: 1 | 2;
};

function getInitialMatches(
  bracket: ActiveBracket
): ActiveMatch[] {
  const firstRound =
    isDoubleBracket(bracket)
      ? bracket.winnerRounds[0]
      : bracket.rounds[0];

  return firstRound?.matches ?? [];
}

function getTeamAtSlot(
  match: ActiveMatch,
  position: 1 | 2
): BracketTeam | null {
  return position === 1
    ? match.team1
    : match.team2;
}

function setTeamAtSlot(
  match: ActiveMatch,
  position: 1 | 2,
  team: BracketTeam | null
): void {
  if (position === 1) {
    match.team1 = team;
  } else {
    match.team2 = team;
  }
}

function findInitialParticipantSlot(
  bracket: ActiveBracket,
  teamId: string
): InitialParticipantSlot | null {
  for (const match of getInitialMatches(
    bracket
  )) {
    if (match.team1?.id === teamId) {
      return {
        match,
        position: 1,
      };
    }

    if (match.team2?.id === teamId) {
      return {
        match,
        position: 2,
      };
    }
  }

  return null;
}

function findActiveMatch(
  bracket: ActiveBracket,
  matchId: string
): ActiveMatch | null {
  if (isDoubleBracket(bracket)) {
    for (const round of bracket.winnerRounds) {
      const match = round.matches.find(
        (currentMatch) =>
          currentMatch.id === matchId
      );

      if (match) {
        return match;
      }
    }

    for (const round of bracket.loserRounds) {
      const match = round.matches.find(
        (currentMatch) =>
          currentMatch.id === matchId
      );

      if (match) {
        return match;
      }
    }

    if (bracket.grandFinal?.id === matchId) {
      return bracket.grandFinal;
    }

    if (bracket.resetFinal?.id === matchId) {
      return bracket.resetFinal;
    }

    return null;
  }

  for (const round of bracket.rounds) {
    const match = round.matches.find(
      (currentMatch) =>
        currentMatch.id === matchId
    );

    if (match) {
      return match;
    }
  }

  return null;
}

function resetSingleMatchState(
  match: BracketMatch,
  clearParticipants: boolean
): void {
  if (clearParticipants) {
    match.team1 = null;
    match.team2 = null;
  }

  match.score1 = 0;
  match.score2 = 0;
  match.winnerId = null;
  match.completed = false;
}

function resetDoubleMatchForReorder(
  match: DoubleBracketMatch,
  clearParticipants: boolean
): void {
  if (clearParticipants) {
    match.team1 = null;
    match.team2 = null;
  }

  match.score1 = 0;
  match.score2 = 0;
  match.winnerId = null;
  match.loserId = null;
  match.completed = false;
  match.automaticAdvance = false;
}

function advanceInitialSingleByes(
  bracket: TournamentBracket
): void {
  const firstRound = bracket.rounds[0];

  if (!firstRound) {
    return;
  }

  for (const match of firstRound.matches) {
    const onlyTeam =
      match.team1 && !match.team2
        ? match.team1
        : match.team2 && !match.team1
          ? match.team2
          : null;

    if (!onlyTeam) {
      continue;
    }

    match.score1 = 0;
    match.score2 = 0;
    match.winnerId = onlyTeam.id;
    match.completed = true;

    if (
      !match.nextMatchId ||
      !match.nextMatchPosition
    ) {
      bracket.champion = onlyTeam;
      continue;
    }

    const nextMatch = findActiveMatch(
      bracket,
      match.nextMatchId
    );

    if (nextMatch) {
      setTeamAtSlot(
        nextMatch,
        match.nextMatchPosition,
        onlyTeam
      );
    }
  }
}

function advanceInitialDoubleByes(
  bracket: DoubleTournamentBracket
): void {
  const firstRound =
    bracket.winnerRounds[0];

  if (!firstRound) {
    return;
  }

  for (const match of firstRound.matches) {
    const onlyTeam =
      match.team1 && !match.team2
        ? match.team1
        : match.team2 && !match.team1
          ? match.team2
          : null;

    if (!onlyTeam) {
      continue;
    }

    match.score1 = 0;
    match.score2 = 0;
    match.winnerId = onlyTeam.id;
    match.loserId = null;
    match.completed = true;
    match.automaticAdvance = true;

    if (
      match.nextMatchId &&
      match.nextMatchPosition
    ) {
      const nextMatch = findActiveMatch(
        bracket,
        match.nextMatchId
      );

      if (nextMatch) {
        setTeamAtSlot(
          nextMatch,
          match.nextMatchPosition,
          onlyTeam
        );
      }
    }
  }

  propagateAutomaticByes(bracket);
}

function rebuildBracketAfterInitialReorder(
  bracket: ActiveBracket
): ActiveBracket {
  if (isDoubleBracket(bracket)) {
    const nextBracket =
      structuredClone(bracket);

    nextBracket.winnerRounds.forEach(
      (round, roundIndex) => {
        round.matches.forEach(
          (match) => {
            resetDoubleMatchForReorder(
              match,
              roundIndex > 0
            );
          }
        );
      }
    );

    nextBracket.loserRounds.forEach(
      (round) => {
        round.matches.forEach(
          (match) => {
            resetDoubleMatchForReorder(
              match,
              true
            );
          }
        );
      }
    );

    if (nextBracket.grandFinal) {
      resetDoubleMatchForReorder(
        nextBracket.grandFinal,
        true
      );
    }

    if (nextBracket.resetFinal) {
      resetDoubleMatchForReorder(
        nextBracket.resetFinal,
        true
      );
    }

    nextBracket.champion = null;

    advanceInitialDoubleByes(
      nextBracket
    );

    nextBracket.updatedAt =
      new Date().toISOString();

    delete (
      nextBracket as BracketWithPositionLock
    ).positionsLocked;

    return nextBracket;
  }

  const nextBracket =
    structuredClone(bracket);

  nextBracket.rounds.forEach(
    (round, roundIndex) => {
      round.matches.forEach(
        (match) => {
          resetSingleMatchState(
            match,
            roundIndex > 0
          );
        }
      );
    }
  );

  nextBracket.champion = null;

  advanceInitialSingleByes(
    nextBracket
  );

  nextBracket.updatedAt =
    new Date().toISOString();

  delete (
    nextBracket as BracketWithPositionLock
  ).positionsLocked;

  return nextBracket;
}

/**
 * Genera el bracket correspondiente al formato
 * seleccionado al crear el torneo.
 */
function generateTournamentBracket(
  tournament: TournamentWithFormat
): ActiveBracket {
  const format =
    normalizeTournamentFormat(
      tournament.format
    );

  if (format === "double") {
    return generateDoubleBracket(
      tournament
    );
  }

  return generateBracket(
    tournament
  );
}

export default function BracketView({
  tournamentId,
}: Props) {
  const searchParams = useSearchParams();
  const [tournament, setTournament] =
    useState<TournamentWithFormat | null>(
      null
    );

  const [bracket, setBracket] =
    useState<ActiveBracket | null>(
      null
    );

  const [
    participantLogos,
    setParticipantLogos,
  ] = useState<ParticipantLogoMap>({});

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [dialog, setDialog] =
    useState<ResultDialog>(null);

  const [winnerScore, setWinnerScore] =
    useState(2);

  const [loserScore, setLoserScore] =
    useState(1);

  const [activeTab, setActiveTab] =
    useState("BRACKET");

  const [isTournamentOwner, setIsTournamentOwner] =
    useState(false);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [canManageBracket, setCanManageBracket] =
    useState(false);

  const [liveMatchId, setLiveMatchId] =
    useState<string | null>(null);

  const [updatingLiveMatch, setUpdatingLiveMatch] =
    useState(false);

  const [finalizingTournament, setFinalizingTournament] =
    useState(false);

  const tournamentFinished =
    isTournamentFinished(
      tournament?.status
    );

  useEffect(() => {
    const requestedTab =
      searchParams
        .get("tab")
        ?.trim()
        .toUpperCase();

    if (
      requestedTab === "BRACKET" ||
      requestedTab === "EQUIPOS" ||
      requestedTab === "PARTIDOS" ||
      requestedTab === "REGLAS" ||
      requestedTab === "CLASIFICACION" ||
      requestedTab === "STREAM"
    ) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  /**
   * Evita que dos guardados rápidos lleguen
   * a Supabase en un orden incorrecto.
   */
  const saveQueueRef = useRef<
    Promise<void>
  >(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    async function loadTournamentAndBracket() {
      setLoading(true);
      setMessage("");

      try {
        const parsed =
          await getTournament(
            tournamentId
          );

        if (!parsed) {
          if (!cancelled) {
            setTournament(null);
            setBracket(null);
          }

          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const authenticated =
          Boolean(user?.id);

        const {
          data: tournamentOwner,
        } = await supabase
          .from("tournaments")
          .select("user_id")
          .eq("id", tournamentId)
          .maybeSingle();

        const owner =
          Boolean(
            user?.id &&
            tournamentOwner?.user_id &&
            user.id === tournamentOwner.user_id
          );

        let canManageBracketAccess =
          owner;

        if (user?.id && !owner) {
          const {
            data: permissionData,
            error: permissionError,
          } = await supabase.rpc(
            "can_manage_tournament_bracket",
            {
              p_tournament_id: tournamentId,
            }
          );

          if (!permissionError) {
            canManageBracketAccess =
              permissionData === true;
          }
        }

        if (!cancelled) {
          setIsAuthenticated(
            authenticated
          );

          setIsTournamentOwner(
            owner
          );

          setCanManageBracket(
            canManageBracketAccess
          );
        }
        const dbTeams =
          await getTeams(
            tournamentId
          );

        const loadedParticipantLogos =
          dbTeams.reduce<ParticipantLogoMap>(
            (logoMap, team) => {
              const participantName =
                normalizeParticipantKey(
                  team.name
                );

              const logoUrl =
                String(
                  team.logo ?? ""
                ).trim();

              if (
                participantName &&
                logoUrl
              ) {
                logoMap[
                  participantName
                ] = logoUrl;
              }

              return logoMap;
            },
            {}
          );

        /**
         * getTournament puede devolver campos
         * adicionales a Tournament, como format.
         */
        const parsedWithFormat =
          parsed as typeof parsed & {
            format?: string | null;
            stream?: string | null;
            live_match_id?: string | null;
            status?: string | null;
            mode?: "team" | "individual" | null;
            organization?: string | null;
          };

        const tournamentWithTeams:
          TournamentWithFormat = {
            id: parsed.id,
            name: parsed.name,
            game: parsed.game,
            teamCount: parsed.teams,

            teams: dbTeams.map(
              (team) => team.name
            ),

            format:
              parsedWithFormat.format ??
              "single",

            stream:
              parsedWithFormat.stream ??
              null,

            status:
              parsedWithFormat.status ??
              null,

            mode:
              parsedWithFormat.mode ??
              null,

            organization:
              parsedWithFormat.organization ??
              null,
          };

        if (cancelled) {
          return;
        }

        setTournament(
          tournamentWithTeams
        );

        setParticipantLogos(
          loadedParticipantLogos
        );

        setLiveMatchId(
          parsedWithFormat.live_match_id ??
            null
        );

        /**
         * bracketStorage todavía está tipado
         * originalmente para TournamentBracket.
         *
         * Los dos formatos se almacenan como JSON
         * en la misma columna de Supabase.
         */
        const storedBracket =
          await getBracket(
            tournamentId
          );

        const savedBracket =
          storedBracket as
            | ActiveBracket
            | null;

        if (cancelled) {
          return;
        }

        const participantCount =
          tournamentWithTeams.teams.filter(
            (teamName) =>
              teamName.trim().length > 0
          ).length;

        const expectedFormat =
          normalizeTournamentFormat(
            tournamentWithTeams.format
          );

        const savedFormat:
          TournamentFormat | null =
          savedBracket
            ? isDoubleBracket(savedBracket)
              ? "double"
              : "single"
            : null;

        /**
         * Un fixture guardado es la fuente oficial del torneo.
         *
         * Mientras la cantidad de participantes siga cabiendo dentro
         * del tamaño actual de la llave, se conserva exactamente como
         * está para no borrar cruces, BYEs, posiciones ni avances.
         *
         * Si la lista oficial supera el tamaño de la llave guardada,
         * el fixture puede ampliarse automáticamente únicamente cuando
         * el torneo todavía no registró ningún resultado real y las
         * posiciones nunca fueron bloqueadas.
         */
        const savedBracketNeedsExpansion =
          canManageBracketAccess &&
          savedBracket !== null &&
          savedBracket.tournamentId ===
            tournamentId &&
          savedFormat === expectedFormat &&
          participantCount >
            savedBracket.teamCount &&
          !bracketHasRealResult(
            savedBracket
          ) &&
          !bracketPositionsAreLocked(
            savedBracket
          ) &&
          !isTournamentFinished(
            tournamentWithTeams.status
          );

        const savedBracketIsValid =
          savedBracket !== null &&
          savedBracket.tournamentId ===
            tournamentId &&
          savedFormat === expectedFormat &&
          !savedBracketNeedsExpansion;

        if (savedBracketIsValid) {
          /**
           * Antes de mostrar una llave de doble eliminación
           * guardada, comprobamos que cada participante de
           * rondas futuras todavía tenga una ruta válida.
           *
           * Esto elimina equipos huérfanos que pudieron quedar
           * después de corregir resultados, editar participantes
           * o rehacer parcialmente el fixture.
           */
          if (
            isDoubleBracket(savedBracket) &&
            canManageBracketAccess
          ) {
            const repairedBracket =
              repairDoubleBracketConsistency(
                savedBracket
              );

            const bracketWasRepaired =
              repairedBracket.updatedAt !==
              savedBracket.updatedAt;

            if (bracketWasRepaired) {
              /**
               * La reparación se guarda en Supabase para que
               * todos los administradores reciban el mismo
               * fixture consistente.
               *
               * Si el guardado falla por permisos o conexión,
               * la interfaz igualmente utiliza la versión
               * reparada durante esta sesión.
               */
              try {
                await saveBracketToSupabase(
                  tournamentId,
                  repairedBracket as unknown as
                    TournamentBracket
                );
              } catch (repairSaveError) {
                if (!cancelled) {
                  setMessage(
                    getErrorMessage(
                      repairSaveError,
                      "El fixture fue reparado localmente, pero no se pudo guardar la reparación."
                    )
                  );
                }
              }
            }

            if (!cancelled) {
              setBracket(
                repairedBracket
              );
            }

            return;
          }

          setBracket(savedBracket);
          return;
        }

        if (
          participantCount < 2 ||
          !canManageBracketAccess
        ) {
          setBracket(
            savedBracket
          );
          return;
        }

        const createdBracket =
          generateTournamentBracket(
            tournamentWithTeams
          );

        const bracketWithTournamentId:
          ActiveBracket = {
          ...createdBracket,
          tournamentId,
        };

        await saveBracketToSupabase(
          tournamentId,

          /**
           * Supabase guarda este objeto como JSON.
           * El cast será eliminado cuando se amplíe
           * bracketStorage para aceptar ambos tipos.
           */
          bracketWithTournamentId as unknown as
            TournamentBracket
        );

        if (!cancelled) {
          setBracket(
            bracketWithTournamentId
          );

          if (savedBracketNeedsExpansion) {
            setMessage(
              `El fixture se amplió automáticamente a ${bracketWithTournamentId.teamCount} participantes.`
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            getErrorMessage(
              error,
              "No se pudo cargar el torneo."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTournamentAndBracket();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  /**
   * Mantiene el fixture sincronizado en tiempo real.
   *
   * Cada vez que Supabase actualiza la fila del bracket de este
   * torneo, todos los espectadores y administradores que tengan
   * la página abierta reciben el nuevo JSON sin necesidad de F5.
   *
   * Esta suscripción es únicamente de lectura: no modifica cruces,
   * resultados, BYEs, posiciones ni permisos de administración.
   */
  useEffect(() => {
    const channel = supabase
      .channel(
        `bracket-realtime-${tournamentId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "brackets",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const incomingBracket =
            payload.new?.bracket as
              | ActiveBracket
              | undefined;

          if (!incomingBracket) {
            return;
          }

          setBracket(
            incomingBracket
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setMessage("");
        },
        2800
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  useEffect(() => {
    if (!dialog) {
      return;
    }

    const closeWithEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setDialog(null);
      }
    };

    window.addEventListener(
      "keydown",
      closeWithEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeWithEscape
      );
    };
  }, [dialog]);

  /**
   * Actualiza primero la interfaz y después
   * guarda el bracket en Supabase.
   */
  const updateAndSaveBracket = async (
    nextBracket: ActiveBracket
  ): Promise<boolean> => {
    if (!canManageBracket) {
      return false;
    }

    const previousBracket =
      bracket;

    const bracketToSave:
      ActiveBracket = {
      ...nextBracket,
      tournamentId,
      updatedAt:
        new Date().toISOString(),
    };

    setBracket(bracketToSave);

    const saveOperation =
      saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
          saveBracketToSupabase(
            tournamentId,
            bracketToSave as unknown as
              TournamentBracket
          )
        );

    saveQueueRef.current =
      saveOperation;

    try {
      await saveOperation;

      return true;
    } catch (error) {
      setBracket(
        (currentBracket) => {
          if (
            currentBracket?.updatedAt ===
            bracketToSave.updatedAt
          ) {
            return previousBracket;
          }

          return currentBracket;
        }
      );

      setMessage(
        getErrorMessage(
          error,
          "No se pudo guardar el fixture."
        )
      );

      return false;
    }
  };


  const handleToggleLiveMatch = async (
    match: ActiveMatch
  ) => {
    if (
      !isTournamentOwner ||
      updatingLiveMatch
    ) {
      return;
    }

    if (tournamentFinished) {
      setMessage(
        "El torneo ya está finalizado y no puede marcar partidos en transmisión."
      );
      return;
    }

    if (
      !match.team1 ||
      !match.team2
    ) {
      setMessage(
        "Los dos participantes deben estar definidos antes de transmitir el partido."
      );
      return;
    }

    const nextLiveMatchId =
      liveMatchId === match.id
        ? null
        : match.id;

    setUpdatingLiveMatch(true);

    try {
      await updateTournamentLiveMatch(
        tournamentId,
        nextLiveMatchId
      );

      setLiveMatchId(
        nextLiveMatchId
      );

      setMessage(
        nextLiveMatchId
          ? `${match.team1.name} vs ${match.team2.name} está marcado como partido en transmisión.`
          : "El partido fue retirado de la transmisión."
      );
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          "No se pudo actualizar la transmisión."
        )
      );
    } finally {
      setUpdatingLiveMatch(false);
    }
  };

  const handleClearLiveMatch = async () => {
    if (
      !isTournamentOwner ||
      !liveMatchId ||
      updatingLiveMatch
    ) {
      return;
    }

    setUpdatingLiveMatch(true);

    try {
      await updateTournamentLiveMatch(
        tournamentId,
        null
      );

      setLiveMatchId(null);
      setMessage(
        "El partido fue retirado de la transmisión."
      );
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          "No se pudo quitar el partido de la transmisión."
        )
      );
    } finally {
      setUpdatingLiveMatch(false);
    }
  };


  const handleSwapInitialParticipants =
    async (
      sourceTeamId: string,
      targetTeamId: string
    ) => {
      if (!bracket) {
        return;
      }

      if (
        !isTournamentOwner ||
        tournamentFinished ||
        bracketPositionsAreLocked(
          bracket
        ) ||
        bracketHasRealResult(bracket)
      ) {
        setMessage(
          "Las posiciones ya no pueden modificarse porque el torneo ya comenzó."
        );
        return;
      }

      if (sourceTeamId === targetTeamId) {
        return;
      }

      const workingBracket =
        structuredClone(
          bracket
        ) as ActiveBracket;

      const sourceSlot =
        findInitialParticipantSlot(
          workingBracket,
          sourceTeamId
        );

      const targetSlot =
        findInitialParticipantSlot(
          workingBracket,
          targetTeamId
        );

      if (!sourceSlot || !targetSlot) {
        setMessage(
          "No se encontraron las posiciones iniciales de los participantes seleccionados."
        );
        return;
      }

      const sourceTeam =
        getTeamAtSlot(
          sourceSlot.match,
          sourceSlot.position
        );

      const targetTeam =
        getTeamAtSlot(
          targetSlot.match,
          targetSlot.position
        );

      if (!sourceTeam || !targetTeam) {
        return;
      }

      setTeamAtSlot(
        sourceSlot.match,
        sourceSlot.position,
        targetTeam
      );

      setTeamAtSlot(
        targetSlot.match,
        targetSlot.position,
        sourceTeam
      );

      const nextBracket =
        rebuildBracketAfterInitialReorder(
          workingBracket
        );

      const saved =
        await updateAndSaveBracket(
          nextBracket
        );

      if (!saved) {
        return;
      }

      setMessage(
        `${sourceTeam.name} ↔ ${targetTeam.name}: posiciones intercambiadas.`
      );
    };

  const handleSelectWinner = (
    match: ActiveMatch,
    winnerId: string
  ) => {
    if (!canManageBracket) {
      return;
    }

    if (tournamentFinished) {
      setMessage(
        "El torneo está finalizado. Los resultados ya no pueden modificarse."
      );
      return;
    }

    if (
      !match.team1 ||
      !match.team2
    ) {
      setMessage(
        "Los dos equipos deben estar definidos."
      );

      return;
    }

    if (
      isDoubleMatch(match) &&
      match.automaticAdvance
    ) {
      setMessage(
        "Este partido fue resuelto automáticamente por BYE."
      );

      return;
    }

    const winner =
      match.team1.id === winnerId
        ? match.team1
        : match.team2.id === winnerId
          ? match.team2
          : null;

    if (!winner) {
      return;
    }

    const currentWinnerScore =
      match.winnerId === winnerId
        ? match.team1.id === winnerId
          ? match.score1
          : match.score2
        : 2;

    const currentLoserScore =
      match.winnerId === winnerId
        ? match.team1.id === winnerId
          ? match.score2
          : match.score1
        : 1;

    setWinnerScore(
      currentWinnerScore >
        currentLoserScore
        ? currentWinnerScore
        : 2
    );

    setLoserScore(
      currentWinnerScore >
        currentLoserScore
        ? currentLoserScore
        : 1
    );

    setDialog({
      match,
      winner,
    });
  };

  const handleConfirmResult =
    async () => {
      if (
        !bracket ||
        !dialog ||
        !canManageBracket
      ) {
        return;
      }

      if (tournamentFinished) {
        setDialog(null);
        setMessage(
          "El torneo está finalizado. Los resultados ya no pueden modificarse."
        );
        return;
      }

      const selectedDialog =
        dialog;

      try {
        let nextBracket:
          ActiveBracket;

        if (isDoubleBracket(bracket)) {
          const match =
            selectedDialog.match;

          if (
            !match.team1 ||
            !match.team2
          ) {
            throw new Error(
              "Los dos equipos deben estar definidos."
            );
          }

          const winnerIsTeam1 =
            match.team1.id ===
            selectedDialog.winner.id;

          /**
           * advance.ts recibe score1 y score2
           * respetando las posiciones reales.
           */
          const score1 =
            winnerIsTeam1
              ? winnerScore
              : loserScore;

          const score2 =
            winnerIsTeam1
              ? loserScore
              : winnerScore;

          const advancedBracket =
            setDoubleMatchResultAndAdvance(
              bracket,
              selectedDialog.match.id,
              score1,
              score2
            );

          nextBracket =
            lockBracketPositions({
              ...advancedBracket,
              champion:
                calculateChampion(
                  advancedBracket
                ),
            });
        } else {
          nextBracket =
            lockBracketPositions(
              setMatchResultAndAdvance(
                bracket,
                selectedDialog.match.id,
                selectedDialog.winner.id,
                winnerScore,
                loserScore
              )
            );
        }

        setDialog(null);

        const saved =
          await updateAndSaveBracket(
            nextBracket
          );

        if (!saved) {
          return;
        }

        setMessage(
          `${selectedDialog.winner.name} ganó ${winnerScore}-${loserScore} y avanzó.`
        );
      } catch (error) {
        setMessage(
          getErrorMessage(
            error,
            "No se pudo registrar el resultado."
          )
        );
      }
    };

  const handleCorrectResult =
    async (
      matchId: string
    ) => {
      if (
        !bracket ||
        !canManageBracket
      ) {
        return;
      }

      if (tournamentFinished) {
        setMessage(
          "El torneo está finalizado. Los resultados ya no pueden modificarse."
        );
        return;
      }

      try {
        const nextBracket =
          isDoubleBracket(bracket)
            ? resetDoubleMatchWinner(
                bracket,
                matchId
              )
            : resetMatchWinner(
                bracket,
                matchId
              );

        const saved =
          await updateAndSaveBracket(
            nextBracket
          );

        if (!saved) {
          return;
        }

        setDialog(null);

        setMessage(
          "El resultado fue corregido."
        );
      } catch (error) {
        setMessage(
          getErrorMessage(
            error,
            "No se pudo corregir el partido."
          )
        );
      }
    };

  const handleResetTournament =
    async () => {
      if (
        !tournament ||
        !isTournamentOwner
      ) {
        return;
      }

      if (tournamentFinished) {
        setMessage(
          "El torneo está finalizado. El fixture ya no puede reiniciarse."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "¿Seguro que quieres reiniciar todos los resultados del fixture?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const newBracket =
          generateTournamentBracket(
            tournament
          );

        const bracketWithTournamentId:
          ActiveBracket = {
          ...newBracket,
          tournamentId,
        };

        const saved =
          await updateAndSaveBracket(
            bracketWithTournamentId
          );

        if (!saved) {
          return;
        }

        setDialog(null);

        setMessage(
          "El fixture fue reiniciado."
        );
      } catch (error) {
        setMessage(
          getErrorMessage(
            error,
            "No se pudo reiniciar el fixture."
          )
        );
      }
    };

  const handleFinishTournament =
    async () => {
      if (
        !tournament ||
        !bracket ||
        !isTournamentOwner ||
        finalizingTournament
      ) {
        return;
      }

      if (!bracket.champion) {
        setMessage(
          "Primero debe definirse el campeón antes de finalizar el torneo."
        );
        return;
      }

      if (tournamentFinished) {
        setMessage(
          "Este torneo ya está finalizado."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `¿Seguro que quieres finalizar el torneo?\n\nCampeón: ${bracket.champion.name}\n\nDespués de finalizarlo, los resultados quedarán bloqueados.`
        );

      if (!confirmed) {
        return;
      }

      setFinalizingTournament(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "Tu sesión no está disponible. Inicia sesión nuevamente."
          );
        }

        const {
          data: updatedTournament,
          error: updateError,
        } = await supabase
          .from("tournaments")
          .update({
            status: "Finalizado",
            live_match_id: null,
          })
          .eq("id", tournamentId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();

        if (
          updateError ||
          !updatedTournament
        ) {
          throw new Error(
            updateError?.message ||
              "No se pudo finalizar el torneo."
          );
        }

        setTournament(
          (currentTournament) =>
            currentTournament
              ? {
                  ...currentTournament,
                  status: "Finalizado",
                }
              : currentTournament
        );

        setLiveMatchId(null);
        setDialog(null);

        setMessage(
          `Torneo finalizado correctamente. Campeón: ${bracket.champion.name}.`
        );
      } catch (error) {
        setMessage(
          getErrorMessage(
            error,
            "No se pudo finalizar el torneo."
          )
        );
      } finally {
        setFinalizingTournament(false);
      }
    };

  if (loading) {
    return <LoadingScreen />;
  }

  if (
    !tournament ||
    !bracket
  ) {
    return <EmptyTournament />;
  }

  const doubleElimination =
    isDoubleBracket(bracket);

  const canReorderInitialParticipants =
    isTournamentOwner &&
    !tournamentFinished &&
    !bracketPositionsAreLocked(
      bracket
    ) &&
    !bracketHasRealResult(bracket);

  return (
    <main className="min-h-screen bg-[#02070d] text-white">
      <Header
        isAuthenticated={
          isAuthenticated
        }
      />

<TournamentHero
  tournament={tournament}
  bracket={bracket}
/>

      <TournamentNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {message && (
        <Toast
          message={message}
          onClose={() =>
            setMessage("")
          }
        />
      )}

      {dialog && canManageBracket && (
        <ResultModal
          match={dialog.match}
          winner={dialog.winner}
          participantLogos={
            participantLogos
          }
          winnerScore={winnerScore}
          loserScore={loserScore}
          onWinnerScoreChange={
            setWinnerScore
          }
          onLoserScoreChange={
            setLoserScore
          }
          onCancel={() =>
            setDialog(null)
          }
          onConfirm={
            handleConfirmResult
          }
        />
      )}

      {activeTab === "BRACKET" && (
        <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
            <section
              id="fixture"
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#050a10] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            >
              <div className="flex flex-col gap-4 border-b border-white/10 bg-[#080e15] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.9)]" />

                    <h2 className="text-xl font-black">
                      {doubleElimination
                        ? "Fixture de doble eliminación"
                        : "Fixture del torneo"}
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-gray-400">
                    {tournamentFinished
                      ? "El torneo está finalizado. Los resultados quedan disponibles en modo de consulta."
                      : canManageBracket
                        ? "Haz clic en el equipo ganador y registra el resultado."
                        : "Consulta los cruces y resultados del torneo en tiempo real."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-black text-gray-400">
                    🖱️ MANTÉN CLIC Y ARRASTRA
                  </div>

                  {isTournamentOwner && (
                    <>
                      {tournamentFinished ? (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-300">
                          ✓ TORNEO FINALIZADO
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            void handleFinishTournament();
                          }}
                          disabled={
                            !bracket.champion ||
                            finalizingTournament
                          }
                          title={
                            bracket.champion
                              ? "Finalizar el torneo y bloquear sus resultados."
                              : "Primero debe definirse el campeón."
                          }
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-gray-600"
                        >
                          {finalizingTournament
                            ? "FINALIZANDO..."
                            : bracket.champion
                              ? "FINALIZAR TORNEO"
                              : "FINAL PENDIENTE"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          void handleResetTournament();
                        }}
                        disabled={
                          tournamentFinished ||
                          finalizingTournament
                        }
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-gray-600"
                      >
                        REINICIAR FIXTURE
                      </button>
                    </>
                  )}
                </div>
              </div>

              {canReorderInitialParticipants && (
                <div className="border-b border-white/10 bg-[#0b1017] px-5 py-3">
                  <p className="text-sm font-black text-gray-200">
                    🔒 Arrastra y suelta los participantes para intercambiar sus posiciones.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    ⚠️ Las posiciones podrán modificarse únicamente antes de registrar el primer resultado.
                  </p>
                </div>
              )}

 <BracketCanvas
  bracket={bracket}
  participantLogos={
    participantLogos
  }
  canManageResults={
    canManageBracket &&
    !tournamentFinished
  }
  onSelectWinner={handleSelectWinner}
  onResetWinner={(matchId) => {
    void handleCorrectResult(matchId);
  }}
  canReorderParticipants={
    canReorderInitialParticipants
  }
  onSwapInitialParticipants={(
    sourceTeamId,
    targetTeamId
  ) => {
    void handleSwapInitialParticipants(
      sourceTeamId,
      targetTeamId
    );
  }}
  liveMatchId={liveMatchId}
  canManageLiveMatch={
    isTournamentOwner &&
    !tournamentFinished
  }
  updatingLiveMatch={updatingLiveMatch}
  onToggleLiveMatch={(match) => {
    void handleToggleLiveMatch(match);
  }}
/>
            </section>

            <aside className="space-y-5">
              <ChampionPanel
                bracket={bracket}
              />

              <ProgressPanel
                bracket={bracket}
              />

              <InformationPanel
                tournament={tournament}
                bracket={bracket}
              />

              {canManageBracket && (
                <InstructionsPanel />
              )}

              {isTournamentOwner && (
                <div className="space-y-3">
                  <Link
                    href={`/tournaments/${tournamentId}/edit`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3.5 text-center text-sm font-black text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-500/20 hover:text-blue-200"
                  >
                    <span>✏️</span>
                    EDITAR INFORMACIÓN DEL TORNEO
                  </Link>

                  <Link
                    href={`/tournaments/${tournamentId}/teams`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5 text-center text-sm font-black text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/20 hover:text-amber-200"
                  >
                    <span>🛡️</span>
                    EDITAR EQUIPOS Y LOGOS
                  </Link>
                </div>
              )}

              {isAuthenticated && (
                <Link
                  href="/create"
                  className="flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black transition hover:bg-red-700"
                >
                  + CREAR OTRO TORNEO
                </Link>
              )}
            </aside>
          </div>
        </section>
      )}

      {activeTab === "EQUIPOS" && (
        <TeamsTab
          tournament={tournament}
        />
      )}

{activeTab === "PARTIDOS" && (
  <MatchesTab
    bracket={bracket}
  />
)}

{activeTab === "REGLAS" && (
  <RulesTab
    tournamentId={tournamentId}
  />
)}

{activeTab === "CLASIFICACION" && (
  <ClassificationTab
    bracket={bracket}
    participantLabel={
      tournament.mode === "individual"
        ? "Jugador"
        : "Equipo"
    }
  />
)}

{activeTab === "STREAM" && (
  <StreamTab
    tournamentId={tournamentId}
    tournamentName={tournament.name}
    streamUrl={tournament.stream}
    bracket={bracket}
    participantLogos={
      participantLogos
    }
    liveMatchId={liveMatchId}
    isTournamentOwner={
      isTournamentOwner &&
      !tournamentFinished
    }
    updatingLiveMatch={updatingLiveMatch}
    onClearLiveMatch={() => {
      void handleClearLiveMatch();
    }}
    onGoToBracket={() => {
      setActiveTab("BRACKET");
    }}
  />
)}

      <Footer />
    </main>
  );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}