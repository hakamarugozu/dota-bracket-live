"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type AssignedTournament = {
  permission_id: string;
  tournament_id: string;
  tournament_name: string;
  tournament_game: string;
  tournament_format: string | null;
  tournament_mode:
    | "team"
    | "individual"
    | null;
  tournament_status: string | null;
  tournament_date: string | null;
  tournament_banner: string | null;
  owner_user_id: string;
  owner_username: string;
  can_manage_bracket: boolean;
  can_manage_participants: boolean;
  permission_created_at: string;
  permission_updated_at: string;
};

function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toLowerCase();
}

function getStatusClasses(
  status: string | null,
) {
  const normalized =
    normalizeText(status);

  if (
    normalized.includes("finalizado")
  ) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (
    normalized.includes("curso")
  ) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  if (
    normalized.includes("inscripcion")
  ) {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }

  if (
    normalized.includes("proxim")
  ) {
    return "border-violet-500/25 bg-violet-500/10 text-violet-300";
  }

  return "border-white/10 bg-white/[0.04] text-neutral-400";
}

function formatTournamentDate(
  date: string | null,
) {
  if (!date) {
    return "Fecha no definida";
  }

  const normalizedDate =
    date.includes("T")
      ? date
      : `${date}T12:00:00`;

  const parsedDate =
    new Date(normalizedDate);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "es-BO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(parsedDate);
}

function getFormatLabel(
  format: string | null,
) {
  const normalized =
    normalizeText(format)
      .replaceAll("_", "-")
      .replaceAll(" ", "-");

  if (
    normalized === "double" ||
    normalized.includes(
      "doble",
    )
  ) {
    return "Eliminación doble";
  }

  return "Eliminación simple";
}

function getModeLabel(
  mode:
    | "team"
    | "individual"
    | null,
) {
  return mode === "individual"
    ? "Individual"
    : "Por equipos";
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

export default function AssignedTournamentsPage() {
  const [
    tournaments,
    setTournaments,
  ] = useState<
    AssignedTournament[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadAssignedTournaments =
    useCallback(
      async (
        showRefreshingState = false,
      ) => {
        if (showRefreshingState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        try {
          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            throw new Error(
              userError?.message ||
                "Tu sesión no está disponible. Inicia sesión nuevamente.",
            );
          }

          const {
            data,
            error,
          } = await supabase.rpc(
            "list_my_assigned_tournaments",
          );

          if (error) {
            throw new Error(
              error.message,
            );
          }

          setTournaments(
            (data ?? []) as
              AssignedTournament[],
          );
        } catch (error) {
          console.error(
            "Error al cargar los torneos asignados:",
            error,
          );

          setTournaments([]);

          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar los torneos asignados.",
            ),
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadAssignedTournaments();
  }, [loadAssignedTournaments]);

  if (loading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-neutral-500">
            Cargando torneos asignados
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-600/10 px-4 py-2">
              <span className="text-base">
                ⚔
              </span>

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Área de colaboración
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-black text-white sm:text-4xl">
              Torneos asignados
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              Aquí encontrarás los torneos donde otro organizador te concedió acceso. Puedes cerrar la página y regresar al fixture desde esta sección cuando lo necesites.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadAssignedTournaments(
                true,
              );
            }}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-red-500/30 hover:bg-red-600/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            >
              ↻
            </span>

            {refreshing
              ? "Actualizando..."
              : "Actualizar accesos"}
          </button>
        </div>
      </section>

      {errorMessage && (
        <section className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4">
          <p className="text-sm font-semibold text-red-300">
            {errorMessage}
          </p>
        </section>
      )}

      {tournaments.length === 0 ? (
        <section className="mt-6 flex min-h-[430px] items-center justify-center rounded-3xl border border-white/10 bg-[#101012] px-6 text-center">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl">
              ⚔
            </div>

            <h3 className="mt-5 text-xl font-black text-white">
              No tienes torneos asignados
            </h3>

            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              Cuando un organizador te conceda acceso al fixture o a los participantes, el torneo aparecerá automáticamente en esta página.
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-red-500/30 hover:bg-red-600/10 hover:text-red-300"
            >
              Volver al Dashboard
              <span>→</span>
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-white">
                Accesos activos
              </h3>

              <p className="mt-1 text-sm text-neutral-500">
                Cada tarjeta representa un torneo administrado por otro usuario.
              </p>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-black text-neutral-400">
              {tournaments.length}{" "}
              {tournaments.length === 1
                ? "torneo"
                : "torneos"}
            </span>
          </div>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {tournaments.map(
              (tournament) => (
                <article
                  key={
                    tournament.permission_id
                  }
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-[#101012] transition hover:border-red-500/25 hover:shadow-[0_22px_70px_rgba(0,0,0,0.4)]"
                >
                  <div className="relative min-h-28 overflow-hidden border-b border-white/10 bg-gradient-to-br from-red-950/35 via-[#141416] to-[#09090a] px-6 py-5">
                    {tournament.tournament_banner && (
                      <>
                        <img
                          src={
                            tournament.tournament_banner
                          }
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-15"
                        />

                        <div className="absolute inset-0 bg-gradient-to-r from-[#101012] via-[#101012]/90 to-[#101012]/45" />
                      </>
                    )}

                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                          Torneo asignado
                        </p>

                        <h4 className="mt-2 truncate text-xl font-black text-white sm:text-2xl">
                          {
                            tournament.tournament_name
                          }
                        </h4>

                        <p className="mt-2 text-sm text-neutral-400">
                          Organizador:{" "}
                          <span className="font-bold text-neutral-200">
                            {
                              tournament.owner_username
                            }
                          </span>
                        </p>
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClasses(
                          tournament.tournament_status,
                        )}`}
                      >
                        {tournament.tournament_status ||
                          "Sin estado"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-700">
                          Juego
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-neutral-300">
                          {
                            tournament.tournament_game
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-700">
                          Modalidad
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-neutral-300">
                          {getModeLabel(
                            tournament.tournament_mode,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-700">
                          Formato
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-neutral-300">
                          {getFormatLabel(
                            tournament.tournament_format,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-700">
                          Fecha
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-neutral-300">
                          {formatTournamentDate(
                            tournament.tournament_date,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-600">
                        Permisos concedidos
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={
                            tournament.can_manage_bracket
                              ? "rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-300"
                              : "rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-neutral-600"
                          }
                        >
                          {tournament.can_manage_bracket
                            ? "✓ Fixture"
                            : "— Fixture"}
                        </span>

                        <span
                          className={
                            tournament.can_manage_participants
                              ? "rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-300"
                              : "rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-neutral-600"
                          }
                        >
                          {tournament.can_manage_participants
                            ? "✓ Participantes"
                            : "— Participantes"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`mt-5 grid gap-3 ${
                        tournament.can_manage_bracket &&
                        tournament.can_manage_participants
                          ? "sm:grid-cols-2"
                          : "grid-cols-1"
                      }`}
                    >
                      {tournament.can_manage_bracket && (
                        <Link
                          href={`/tournaments/${tournament.tournament_id}/bracket`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-500"
                        >
                          <span>⚔</span>
                          ABRIR FIXTURE
                        </Link>
                      )}

                      {tournament.can_manage_participants && (
                        <Link
                          href={`/tournaments/${tournament.tournament_id}/teams`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-3.5 text-sm font-black text-amber-200 transition hover:border-amber-400/45 hover:bg-amber-500/15 hover:text-amber-100"
                        >
                          <span>👥</span>
                          ADMINISTRAR PARTICIPANTES
                        </Link>
                      )}

                      {!tournament.can_manage_bracket &&
                        !tournament.can_manage_participants && (
                          <div className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] px-5 py-3.5 text-sm font-black text-neutral-600">
                            ACCESO NO DISPONIBLE
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              ),
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-5 py-4">
            <p className="text-sm font-black text-amber-300">
              Acceso controlado
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-200/60">
              El organizador conserva el control total. Tus acciones estarán limitadas a los permisos mostrados en cada tarjeta y el acceso desaparecerá cuando el organizador lo retire.
            </p>
          </section>
        </>
      )}
    </div>
  );
}