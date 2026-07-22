"use client";

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
import ChampionCard from "@/components/tournament/ChampionCard";
import DialogTeam from "@/components/tournament/DialogTeam";
import TeamAvatar from "@/components/tournament/TeamAvatar";
import Link from "next/link";
import Footer from "@/components/tournament/Footer";
import Header from "@/components/tournament/Header";
import MatchesTab from "@/components/tournament/MatchesTab";
import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BracketMatch,
  BracketTeam,
  generateBracket,
  loadBracket,
  resetMatchWinner,
  saveBracket,
  setMatchResultAndAdvance,
  Tournament,
  TournamentBracket,
} from "../../../lib/bracket";
import {
  getTeamIdentity,
  getTeamInitials,
  getTeamLogo,
} from "../../../lib/tournament";

const MATCH_WIDTH = 246;
const MATCH_HEIGHT = 138;
const ROUND_GAP = 82;
const SLOT_HEIGHT = 168;
const CHAMPION_WIDTH = 210;
const PAD_X = 28;
const PAD_Y = 22;

const QUICK_RESULTS = [
  [1, 0],
  [2, 0],
  [2, 1],
  [3, 0],
  [3, 1],
  [3, 2],
] as const;

type MatchPosition = {
  x: number;
  top: number;
  centerY: number;
};

type PositionMap = Record<
  string,
  MatchPosition
>;

type ResultDialog =
  | {
      match: BracketMatch;
      winner: BracketTeam;
    }
  | null;

export default function TournamentPage() {
  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [bracket, setBracket] =
    useState<TournamentBracket | null>(
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
  useEffect(() => {
    try {
      const savedTournament =
        localStorage.getItem(
          "currentTournament"
        );

      if (!savedTournament) {
        return;
      }

      const parsed = JSON.parse(
        savedTournament
      ) as Tournament;

      setTournament(parsed);

      const saved = loadBracket();

      const sameTournament =
        saved &&
        saved.tournamentId === parsed.id &&
        saved.teamCount ===
          parsed.teamCount;

      if (sameTournament) {
        setBracket(saved);
      } else {
        const created =
          generateBracket(parsed);

        saveBracket(created);
        setBracket(created);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el torneo."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(
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

  const updateAndSaveBracket = (
    nextBracket: TournamentBracket
  ) => {
    setBracket(nextBracket);
    saveBracket(nextBracket);
  };

  const handleSelectWinner = (
    match: BracketMatch,
    winnerId: string
  ) => {
    if (!match.team1 || !match.team2) {
      setMessage(
        "Los dos equipos deben estar definidos."
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

  const handleConfirmResult = () => {
    if (!bracket || !dialog) {
      return;
    }

    try {
      const nextBracket =
        setMatchResultAndAdvance(
          bracket,
          dialog.match.id,
          dialog.winner.id,
          winnerScore,
          loserScore
        );

      updateAndSaveBracket(nextBracket);

      setMessage(
        `${dialog.winner.name} ganó ${winnerScore}-${loserScore} y avanzó.`
      );

      setDialog(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el resultado."
      );
    }
  };

  const handleCorrectResult = (
    matchId: string
  ) => {
    if (!bracket) {
      return;
    }

    try {
      const nextBracket =
        resetMatchWinner(
          bracket,
          matchId
        );

      updateAndSaveBracket(nextBracket);

      setMessage(
        "El resultado fue corregido."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo corregir el partido."
      );
    }
  };

  const handleResetTournament = () => {
    if (!tournament) {
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que quieres reiniciar todos los resultados del fixture?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const newBracket =
        generateBracket(tournament);

      updateAndSaveBracket(newBracket);

      setMessage(
        "El fixture fue reiniciado."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo reiniciar el fixture."
      );
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!tournament || !bracket) {
    return <EmptyTournament />;
  }

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
          onClose={() => setMessage("")}
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
          onCancel={() => setDialog(null)}
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
                Fixture del torneo
              </h2>
            </div>

            <p className="mt-2 text-sm text-gray-400">
              Haz clic en el equipo
              ganador y registra el
              resultado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-black text-gray-400">
              🖱️ MANTÉN CLIC Y ARRASTRA
            </div>

            <button
              type="button"
              onClick={
                handleResetTournament
              }
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20"
            >
              REINICIAR FIXTURE
            </button>
          </div>
        </div>

        <BracketCanvas
          bracket={bracket}
          onSelectWinner={
            handleSelectWinner
          }
          onResetWinner={
            handleCorrectResult
          }
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
      <Footer />
    </main>
  );
}