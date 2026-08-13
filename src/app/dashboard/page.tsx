"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getBracket } from "@/lib/bracketStorage";

type DashboardAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
  primary?: boolean;
};

type TournamentSummary = {
  id: string;
  name: string;
  game: string;
  format: string | null;
  mode: "team" | "individual" | null;
  teams: number | null;
  status: string | null;
  date: string | null;
  created_at: string | null;
};


type DashboardTeam = {
  name?: string | null;
};

type DashboardMatch = {
  id?: string;
  team1?: DashboardTeam | null;
  team2?: DashboardTeam | null;
  completed?: boolean;
  automaticAdvance?: boolean;
};

type DashboardRound = {
  matches?: DashboardMatch[];
};

type DashboardBracket = {
  rounds?: DashboardRound[];
  winnerRounds?: DashboardRound[];
  loserRounds?: DashboardRound[];
  grandFinal?: DashboardMatch | null;
  resetFinal?: DashboardMatch | null;
};

type NextMatchSummary = {
  tournamentId: string;
  tournamentName: string;
  team1Name: string;
  team2Name: string;
};

function collectBracketMatches(
  bracket: unknown,
): DashboardMatch[] {
  if (
    !bracket ||
    typeof bracket !== "object" ||
    Array.isArray(bracket)
  ) {
    return [];
  }

  const parsedBracket =
    bracket as DashboardBracket;

  const matches: DashboardMatch[] = [];

  function addRounds(
    rounds: DashboardRound[] | undefined,
  ) {
    if (!Array.isArray(rounds)) {
      return;
    }

    for (const round of rounds) {
      if (!Array.isArray(round.matches)) {
        continue;
      }

      matches.push(...round.matches);
    }
  }

  addRounds(parsedBracket.rounds);
  addRounds(parsedBracket.winnerRounds);
  addRounds(parsedBracket.loserRounds);

  if (parsedBracket.grandFinal) {
    matches.push(parsedBracket.grandFinal);
  }

  if (
    parsedBracket.resetFinal &&
    (
      parsedBracket.resetFinal.team1 ||
      parsedBracket.resetFinal.team2 ||
      parsedBracket.resetFinal.completed
    )
  ) {
    matches.push(parsedBracket.resetFinal);
  }

  return matches;
}

function isAutomaticAdvance(
  match: DashboardMatch,
) {
  return Boolean(match.automaticAdvance);
}

function getTeamName(
  team: DashboardTeam | null | undefined,
) {
  return team?.name?.trim() || "";
}

function getTournamentDateValue(
  tournament: TournamentSummary,
) {
  if (!tournament.date) {
    return Number.MAX_SAFE_INTEGER;
  }

  const normalizedDate =
    tournament.date.includes("T")
      ? tournament.date
      : `${tournament.date}T12:00:00`;

  const timestamp =
    new Date(normalizedDate).getTime();

  return Number.isNaN(timestamp)
    ? Number.MAX_SAFE_INTEGER
    : timestamp;
}

function getTournamentPriority(
  tournament: TournamentSummary,
) {
  const normalizedStatus =
    normalizeText(tournament.status ?? "");

  if (normalizedStatus.includes("curso")) {
    return 0;
  }

  if (
    normalizedStatus.includes("inscripciones") ||
    normalizedStatus.includes("proxim")
  ) {
    return 1;
  }

  if (normalizedStatus.includes("borrador")) {
    return 2;
  }

  if (normalizedStatus.includes("finalizado")) {
    return 4;
  }

  return 3;
}

const dashboardActions: DashboardAction[] = [
  {
    title: "Crear nuevo torneo",
    description:
      "Configura participantes, reglas, formato y genera el fixture.",
    href: "/create",
    icon: "＋",
    primary: true,
  },
  {
    title: "Administrar torneos",
    description:
      "Consulta tus competencias, resultados y enfrentamientos.",
    href: "/tournaments",
    icon: "◆",
  },
];

function formatTournamentDate(value: string | null) {
  if (!value) {
    return "Fecha por definir";
  }

  const normalizedValue = value.includes("T") ? value : `${value}T12:00:00`;
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha por definir";
  }

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getTournamentStatusClasses(status: string | null) {
  const normalizedStatus = normalizeText(status ?? "");

  if (normalizedStatus.includes("finalizado")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }

  if (normalizedStatus.includes("curso")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  }

  if (normalizedStatus.includes("inscripciones")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-400";
  }

  if (normalizedStatus.includes("proxim")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-400";
  }

  if (normalizedStatus.includes("borrador")) {
    return "border-neutral-500/20 bg-neutral-500/10 text-neutral-400";
  }

  return "border-white/10 bg-white/[0.04] text-neutral-400";
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [nextMatch, setNextMatch] = useState<NextMatchSummary | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [tournamentsError, setTournamentsError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoadingTournaments(true);
      setTournamentsError("");

      try {
        const {
          data: { user: authenticatedUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (userError || !authenticatedUser) {
          throw new Error(
            userError?.message ||
              "No se pudo verificar la sesión del usuario.",
          );
        }

        setUser(authenticatedUser);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (!sessionError && session?.access_token) {
          try {
            const adminResponse = await fetch(
              "/api/admin/check",
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                cache: "no-store",
              },
            );

            if (mounted) {
              setIsSuperAdmin(adminResponse.ok);
            }
          } catch (adminCheckError) {
            console.error(
              "No se pudo comprobar el acceso de Super Admin:",
              adminCheckError,
            );

            if (mounted) {
              setIsSuperAdmin(false);
            }
          }
        } else {
          setIsSuperAdmin(false);
        }

        const {
          data: tournamentData,
          error: tournamentsQueryError,
          count,
        } = await supabase
          .from("tournaments")
          .select(
            `
              id,
              name,
              game,
              format,
              mode,
              teams,
              status,
              date,
              created_at
            `,
            {
              count: "exact",
            },
          )
          .eq("user_id", authenticatedUser.id)
          .order("created_at", {
            ascending: false,
          });

        if (!mounted) {
          return;
        }

        if (tournamentsQueryError) {
          throw new Error(
            tournamentsQueryError.message,
          );
        }

        const loadedTournaments =
          (tournamentData ?? []) as TournamentSummary[];

        const tournamentIds =
          loadedTournaments.map(
            (tournament) => tournament.id,
          );

        let loadedParticipantCount = 0;

        if (tournamentIds.length > 0) {
          const {
            error: participantsQueryError,
            count: participantsCount,
          } = await supabase
            .from("teams")
            .select("id", {
              count: "exact",
              head: true,
            })
            .in(
              "tournament_id",
              tournamentIds,
            );

          if (participantsQueryError) {
            console.error(
              "No se pudo contar a los participantes:",
              participantsQueryError.message,
            );
          } else {
            loadedParticipantCount =
              participantsCount ?? 0;
          }
        }

        const bracketResults =
          await Promise.allSettled(
            loadedTournaments.map(
              async (tournament) => ({
                tournament,
                bracket:
                  await getBracket(
                    tournament.id,
                  ),
              }),
            ),
          );

        let loadedMatchCount = 0;

        const loadedBrackets =
          bracketResults.flatMap(
            (result) => {
              if (result.status === "fulfilled") {
                return [result.value];
              }

              console.error(
                "No se pudo cargar uno de los fixtures:",
                result.reason,
              );

              return [];
            },
          );

        for (const item of loadedBrackets) {
          const tournamentMatches =
            collectBracketMatches(
              item.bracket,
            );

          loadedMatchCount +=
            tournamentMatches.filter(
              (match) =>
                !isAutomaticAdvance(match),
            ).length;
        }

        const prioritizedBrackets =
          [...loadedBrackets].sort(
            (first, second) =>
              getTournamentPriority(
                first.tournament,
              ) -
                getTournamentPriority(
                  second.tournament,
                ) ||
              getTournamentDateValue(
                first.tournament,
              ) -
                getTournamentDateValue(
                  second.tournament,
                ),
          );

        let loadedNextMatch:
          NextMatchSummary | null = null;

        for (const item of prioritizedBrackets) {
          if (
            normalizeText(
              item.tournament.status ?? "",
            ).includes("finalizado")
          ) {
            continue;
          }

          const pendingMatch =
            collectBracketMatches(
              item.bracket,
            ).find((match) => {
              const team1Name =
                getTeamName(match.team1);

              const team2Name =
                getTeamName(match.team2);

              return (
                !match.completed &&
                !isAutomaticAdvance(match) &&
                Boolean(team1Name) &&
                Boolean(team2Name)
              );
            });

          if (!pendingMatch) {
            continue;
          }

          loadedNextMatch = {
            tournamentId:
              item.tournament.id,
            tournamentName:
              item.tournament.name,
            team1Name:
              getTeamName(
                pendingMatch.team1,
              ),
            team2Name:
              getTeamName(
                pendingMatch.team2,
              ),
          };

          break;
        }

        if (!mounted) {
          return;
        }

        setTournaments(
          loadedTournaments.slice(0, 4),
        );

        setTournamentCount(
          count ?? loadedTournaments.length,
        );

        setParticipantCount(
          loadedParticipantCount,
        );

        setMatchCount(
          loadedMatchCount,
        );

        setNextMatch(
          loadedNextMatch,
        );
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "Error al cargar el dashboard:",
          error,
        );

        setTournaments([]);
        setTournamentCount(0);
        setParticipantCount(0);
        setMatchCount(0);
        setNextMatch(null);

        setTournamentsError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos del dashboard.",
        );
      } finally {
        if (mounted) {
          setLoadingTournaments(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const fullName =
    typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "Administrador";

  const firstName = fullName.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-red-900/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-600/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Centro de operaciones
              </span>
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Bienvenido, <span className="text-red-500">{firstName}</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              Organiza torneos, administra participantes y controla cada fase de
              la competencia desde un solo lugar.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <Link
              href="/create"
              className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(220,38,38,0.2)] transition hover:-translate-y-0.5 hover:bg-red-500 sm:w-auto"
            >
              <span className="text-xl leading-none">＋</span>
              Crear torneo
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin"
                className="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm font-bold text-amber-300 transition hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-amber-500/15 hover:text-amber-200 sm:w-auto"
              >
                <span className="text-lg leading-none">🛡</span>
                Panel Admin
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Torneos creados
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {loadingTournaments ? "—" : tournamentCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/10 text-xl text-red-400">
              ◆
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            {loadingTournaments
              ? "Cargando tus eventos..."
              : tournamentCount === 0
                ? "Aún no existen torneos creados."
                : "Eventos registrados en tu cuenta."}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Participantes
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {loadingTournaments
                  ? "—"
                  : participantCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl text-neutral-300">
              ♟
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Equipos registrados en tus eventos.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Partidas
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {loadingTournaments
                  ? "—"
                  : matchCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl text-neutral-300">
              ⚔
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Enfrentamientos creados hasta ahora.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Próxima partida
              </p>

              <p className="mt-3 line-clamp-2 text-xl font-black text-white">
                {loadingTournaments
                  ? "Cargando..."
                  : nextMatch
                    ? `${nextMatch.team1Name} vs ${nextMatch.team2Name}`
                    : "Sin definir"}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl text-neutral-300">
              ◷
            </div>
          </div>

          {nextMatch ? (
            <div className="mt-4">
              <p className="line-clamp-1 text-xs text-neutral-600">
                Torneo: {nextMatch.tournamentName}
              </p>

              <Link
                href={`/tournaments/${nextMatch.tournamentId}/bracket`}
                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-red-400 transition hover:text-red-300"
              >
                Ver encuentro
                <span>→</span>
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-xs text-neutral-600">
              No hay enfrentamientos pendientes con ambos participantes definidos.
            </p>
          )}
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Acciones rápidas</h3>

              <p className="mt-1 text-sm text-neutral-500">
                Continúa administrando tu plataforma.
              </p>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-neutral-500">
              Panel principal
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dashboardActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={`group rounded-2xl border p-5 transition hover:-translate-y-1 ${
                  action.primary
                    ? "border-red-500/30 bg-gradient-to-br from-red-600/15 to-red-950/10 hover:border-red-500/60"
                    : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                    action.primary
                      ? "bg-red-600 text-white shadow-[0_10px_25px_rgba(220,38,38,0.2)]"
                      : "bg-white/[0.06] text-neutral-300"
                  }`}
                >
                  {action.icon}
                </div>

                <h4 className="mt-5 text-lg font-bold text-white">
                  {action.title}
                </h4>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {action.description}
                </p>

                <div
                  className={`mt-5 flex items-center gap-2 text-sm font-bold ${
                    action.primary ? "text-red-400" : "text-neutral-400"
                  }`}
                >
                  Abrir sección
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
          <div className="border-b border-white/10 pb-5">
            <h3 className="text-xl font-bold text-white">Tu cuenta</h3>

            <p className="mt-1 text-sm text-neutral-500">
              Información de la sesión actual.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">
                Nombre
              </p>

              <p className="mt-2 break-words text-sm font-semibold text-white">
                {fullName}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">
                Correo electrónico
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-white">
                {user?.email ?? "Cargando información..."}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />

                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    Sesión activa
                  </p>

                  <p className="mt-1 text-xs text-emerald-500/60">
                    Tu cuenta está conectada correctamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#101012]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-xl font-bold text-white">Torneos recientes</h3>

            <p className="mt-1 text-sm text-neutral-500">
              Continúa administrando tus últimos campeonatos.
            </p>
          </div>

          <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-neutral-400">
            {loadingTournaments
              ? "Cargando..."
              : `${tournamentCount} ${
                  tournamentCount === 1 ? "torneo" : "torneos"
                }`}
          </span>
        </div>

        {loadingTournaments ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

            <p className="mt-5 text-sm font-semibold text-neutral-500">
              Cargando tus torneos...
            </p>
          </div>
        ) : tournamentsError ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-600/10 text-2xl font-black text-red-400">
              !
            </div>

            <h4 className="mt-5 text-lg font-bold text-neutral-300">
              No se pudieron cargar los torneos
            </h4>

            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
              {tournamentsError}
            </p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl text-neutral-600">
              ◇
            </div>

            <h4 className="mt-5 text-lg font-bold text-neutral-300">
              Todavía no tienes torneos
            </h4>

            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
              Cuando crees tu primer torneo, aparecerá aquí para que puedas
              continuar administrándolo.
            </p>

            <Link
              href="/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-600/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:border-red-500/50 hover:bg-red-600 hover:text-white"
            >
              ＋ Crear mi primer torneo
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/10">
              {tournaments.map((tournament) => {
                const participantLabel =
                  tournament.mode === "individual" ? "jugadores" : "equipos";
                const tournamentInitial =
                  tournament.name.trim().charAt(0).toUpperCase() || "T";

                return (
                  <article
                    key={tournament.id}
                    className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.025] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-600/10 text-lg font-black text-red-400">
                        {tournamentInitial}
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate text-base font-black text-white transition group-hover:text-red-400 sm:text-lg">
                          {tournament.name}
                        </h4>

                        <p className="mt-1 text-sm leading-6 text-neutral-500">
                          {tournament.game} ·{" "}
                          {tournament.format || "Formato por definir"} ·{" "}
                          {typeof tournament.teams === "number"
                            ? `${tournament.teams} ${participantLabel}`
                            : "Participantes por definir"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                          <span>
                            Fecha del torneo: {formatTournamentDate(tournament.date)}
                          </span>
                          <span className="text-neutral-800">•</span>
                          <span>
                            Creado: {formatTournamentDate(tournament.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                      <span
                        className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${getTournamentStatusClasses(
                          tournament.status,
                        )}`}
                      >
                        {tournament.status || "Estado por definir"}
                      </span>

                      <Link
                        href={`/tournaments/${tournament.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-bold text-neutral-300 transition hover:border-red-500/30 hover:bg-red-600/10 hover:text-red-400"
                      >
                        Abrir torneo
                        <span className="transition group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex justify-center border-t border-white/10 px-5 py-5 sm:px-6">
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-red-500/30 hover:bg-red-600/10 hover:text-red-400"
              >
                Ver todos mis torneos
                <span>→</span>
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}