"use client";

import Link from "next/link";

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

import ResultModal from "@/components/tournament/ResultModal";
import BracketCanvas from "@/components/tournament/BracketCanvas";
import TeamsTab from "@/components/tournament/TeamsTab";
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
  };

type ActiveBracket =
  | TournamentBracket
  | DoubleTournamentBracket;

type ActiveMatch =
  | BracketMatch
  | DoubleBracketMatch;

type ResultDialog =
  | {
      match: ActiveMatch;
      winner: BracketTeam;
    }
  | null;

type Props = {
  tournamentId: string;
};

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

/**
 * Obtiene la cantidad real de participantes
 * guardada dentro de cualquier tipo de bracket.
 */
function getBracketParticipantCount(
  bracket: ActiveBracket
): number {
  return (
    bracket.participantCount ??
    bracket.teamCount
  );
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
  const [tournament, setTournament] =
    useState<TournamentWithFormat | null>(
      null
    );

  const [bracket, setBracket] =
    useState<ActiveBracket | null>(
      null
    );

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

  const [liveMatchId, setLiveMatchId] =
    useState<string | null>(null);

  const [updatingLiveMatch, setUpdatingLiveMatch] =
    useState(false);
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

const {
  data: tournamentOwner,
} = await supabase
  .from("tournaments")
  .select("user_id")
  .eq("id", tournamentId)
  .maybeSingle();

if (!cancelled) {
  setIsTournamentOwner(
    Boolean(
      user?.id &&
      tournamentOwner?.user_id &&
      user.id === tournamentOwner.user_id
    )
  );
}
        const dbTeams =
          await getTeams(
            tournamentId
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
          };

        if (cancelled) {
          return;
        }

        setTournament(
          tournamentWithTeams
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

        const savedBracketIsValid =
          savedBracket !== null &&
          savedBracket.tournamentId ===
            tournamentId &&
          getBracketParticipantCount(
            savedBracket
          ) === participantCount &&
          savedFormat === expectedFormat;

        if (savedBracketIsValid) {
          setBracket(savedBracket);
          return;
        }

        if (participantCount < 2) {
          setBracket(null);
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

  const handleSelectWinner = (
    match: ActiveMatch,
    winnerId: string
  ) => {
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
        !dialog
      ) {
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

          nextBracket = {
            ...advancedBracket,
            champion:
              calculateChampion(
                advancedBracket
              ),
          };
        } else {
          nextBracket =
            setMatchResultAndAdvance(
              bracket,
              selectedDialog.match.id,
              selectedDialog.winner.id,
              winnerScore,
              loserScore
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
      if (!bracket) {
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
      if (!tournament) {
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

  return (
    <main className="min-h-screen bg-[#02070d] text-white">
      <Header />

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

      {dialog && (
        <ResultModal
          match={dialog.match}
          winner={dialog.winner}
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
                    Haz clic en el equipo ganador y registra el resultado.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-black text-gray-400">
                    🖱️ MANTÉN CLIC Y ARRASTRA
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleResetTournament();
                    }}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20"
                  >
                    REINICIAR FIXTURE
                  </button>
                </div>
              </div>

 <BracketCanvas
  bracket={bracket}
  onSelectWinner={handleSelectWinner}
  onResetWinner={(matchId) => {
    void handleCorrectResult(matchId);
  }}
  liveMatchId={liveMatchId}
  canManageLiveMatch={isTournamentOwner}
  updatingLiveMatch={updatingLiveMatch}
  onToggleLiveMatch={(match) => {
    void handleToggleLiveMatch(match);
  }}
/>
            </section>

            <aside className="space-y-5">
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
<InstructionsPanel />

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

<Link
  href="/create"
  className="flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black transition hover:bg-red-700"
>
  + CREAR OTRO TORNEO
</Link>
</aside>
              <InformationPanel
                tournament={tournament}
                bracket={
                  bracket as unknown as
                    TournamentBracket
                }
              />

              <InstructionsPanel />

              <Link
                href="/create"
                className="flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black transition hover:bg-red-700"
              >
                + CREAR OTRO TORNEO
              </Link>
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

{activeTab === "STREAM" && (
  <StreamTab
    tournamentId={tournamentId}
    tournamentName={tournament.name}
    streamUrl={tournament.stream}
    bracket={bracket}
    liveMatchId={liveMatchId}
    isTournamentOwner={isTournamentOwner}
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