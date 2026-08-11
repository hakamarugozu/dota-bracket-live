"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type AdminStatus =
  | "checking"
  | "authorized"
  | "denied";

type AdminUser = {
  id: string;
  username: string | null;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

type AdminTournament = {
  id: string;
  name: string;
  game: string;
  format: string | null;
  mode: "team" | "individual" | null;
  teams: number | null;
  status: string | null;
  date: string | null;
  created_at: string | null;
  user_id: string | null;
};

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Nunca";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat(
    "es-BO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatTournamentDate(
  value: string | null,
): string {
  if (!value) {
    return "Fecha por definir";
  }

  const normalizedValue =
    value.includes("T")
      ? value
      : `${value}T12:00:00`;

  const date =
    new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "Fecha por definir";
  }

  return new Intl.DateTimeFormat(
    "es-BO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getTournamentStatusClasses(
  status: string | null,
): string {
  const normalizedStatus =
    normalizeText(status ?? "");

  if (
    normalizedStatus.includes(
      "finalizado",
    )
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }

  if (
    normalizedStatus.includes("curso")
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  }

  if (
    normalizedStatus.includes(
      "inscripciones",
    )
  ) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-400";
  }

  if (
    normalizedStatus.includes("proxim")
  ) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-400";
  }

  if (
    normalizedStatus.includes(
      "borrador",
    )
  ) {
    return "border-neutral-500/20 bg-neutral-500/10 text-neutral-400";
  }

  return "border-white/10 bg-white/[0.04] text-neutral-400";
}

function getTournamentModeLabel(
  mode: AdminTournament["mode"],
): string {
  if (mode === "individual") {
    return "Individual";
  }

  if (mode === "team") {
    return "Equipos";
  }

  return "No definido";
}

function getTournamentOwner(
  tournament: AdminTournament,
  users: AdminUser[],
): AdminUser | null {
  if (!tournament.user_id) {
    return null;
  }

  return (
    users.find(
      (user) =>
        user.id === tournament.user_id,
    ) ?? null
  );
}

function getUserDisplayName(
  user: AdminUser,
): string {
  return (
    user.username ||
    user.email ||
    "Usuario"
  );
}

export default function AdminPage() {
  const [status, setStatus] =
    useState<AdminStatus>("checking");

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [
    tournaments,
    setTournaments,
  ] = useState<AdminTournament[]>([]);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(false);

  const [
    loadingTournaments,
    setLoadingTournaments,
  ] = useState(false);

  const [
    usersError,
    setUsersError,
  ] = useState("");

  const [
    tournamentsError,
    setTournamentsError,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminPanel() {
      try {
        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.access_token
        ) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        const authorizationHeader = {
          Authorization:
            `Bearer ${session.access_token}`,
        };

        const checkResponse =
          await fetch(
            "/api/admin/check",
            {
              method: "GET",
              headers:
                authorizationHeader,
              cache: "no-store",
            },
          );

        if (!checkResponse.ok) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        const checkData =
          (await checkResponse.json()) as {
            authorized?: boolean;
          };

        if (!checkData.authorized) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        if (cancelled) {
          return;
        }

        setStatus("authorized");

        setLoadingUsers(true);
        setLoadingTournaments(true);

        setUsersError("");
        setTournamentsError("");

        const [
          usersResponse,
          tournamentsResponse,
        ] = await Promise.all([
          fetch(
            "/api/admin/users",
            {
              method: "GET",
              headers:
                authorizationHeader,
              cache: "no-store",
            },
          ),

          fetch(
            "/api/admin/tournaments",
            {
              method: "GET",
              headers:
                authorizationHeader,
              cache: "no-store",
            },
          ),
        ]);

        if (cancelled) {
          return;
        }

        if (usersResponse.ok) {
          const usersData =
            (await usersResponse.json()) as {
              users?: AdminUser[];
            };

          setUsers(
            usersData.users ?? [],
          );
        } else {
          setUsers([]);

          setUsersError(
            "No se pudieron cargar los usuarios.",
          );
        }

        if (
          tournamentsResponse.ok
        ) {
          const tournamentsData =
            (await tournamentsResponse.json()) as {
              tournaments?: AdminTournament[];
            };

          setTournaments(
            tournamentsData.tournaments ??
              [],
          );
        } else {
          setTournaments([]);

          setTournamentsError(
            "No se pudieron cargar los torneos.",
          );
        }
      } catch (error) {
        console.error(
          "Error cargando Super Admin:",
          error,
        );

        if (!cancelled) {
          setUsers([]);
          setTournaments([]);

          setUsersError(
            "No se pudo cargar el panel administrativo.",
          );

          setTournamentsError(
            "No se pudo cargar el panel administrativo.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
          setLoadingTournaments(false);
        }
      }
    }

    void loadAdminPanel();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
            Verificando acceso
          </p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#111113] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-600/10 text-2xl">
            🔒
          </div>

          <h1 className="mt-6 text-2xl font-black">
            Acceso denegado
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Esta sección está reservada exclusivamente
            para el propietario de Esports Bracket Live.
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500"
          >
            Volver al Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#101012] to-[#09090a] p-6 shadow-2xl sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                ✓ Acceso verificado
              </div>

              <h1 className="mt-5 text-3xl font-black sm:text-4xl">
                Super Admin
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
                Centro privado de administración de
                Esports Bracket Live.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-fit rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Usuarios registrados
            </p>

            <p className="mt-3 text-4xl font-black text-white">
              {loadingUsers
                ? "—"
                : users.length}
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Cuentas registradas
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Torneos creados
            </p>

            <p className="mt-3 text-4xl font-black text-white">
              {loadingTournaments
                ? "—"
                : tournaments.length}
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Torneos de toda la plataforma
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Seguridad
            </p>

            <p className="mt-3 text-lg font-black text-emerald-300">
              Protegido
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Acceso exclusivo del propietario
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Modo actual
            </p>

            <p className="mt-3 text-lg font-black text-white">
              Solo lectura
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Ninguna acción destructiva habilitada
            </p>
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#101012]">
          <header className="border-b border-white/10 px-5 py-5 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
              Administración
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Usuarios registrados
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Cuentas existentes en Esports Bracket Live.
            </p>
          </header>

          {loadingUsers ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

                <p className="mt-4 text-sm font-bold text-neutral-500">
                  Cargando usuarios...
                </p>
              </div>
            </div>
          ) : usersError ? (
            <div className="px-6 py-10">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4 text-sm font-semibold text-red-300">
                {usersError}
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-[250px] items-center justify-center px-6 text-center">
              <div>
                <div className="text-3xl">
                  👥
                </div>

                <h3 className="mt-4 text-lg font-black">
                  No hay usuarios
                </h3>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {users.map(
                (user) => (
                  <article
                    key={user.id}
                    className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-600/10 text-sm font-black uppercase text-red-300">
                          {getUserDisplayName(
                            user,
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-white sm:text-base">
                              {getUserDisplayName(
                                user,
                              )}
                            </p>

                            {user.username && (
                              <span className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-300">
                                Username
                              </span>
                            )}
                          </div>

                          {user.username &&
                            user.email && (
                              <p className="mt-1 truncate text-xs font-semibold text-neutral-500">
                                {user.email}
                              </p>
                            )}

                          <p className="mt-1 truncate font-mono text-[11px] text-neutral-700">
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-700">
                        Registrado
                      </p>

                      <p className="mt-1 text-sm font-semibold text-neutral-400">
                        {formatDate(
                          user.created_at,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-700">
                        Último acceso
                      </p>

                      <p className="mt-1 text-sm font-semibold text-neutral-400">
                        {formatDate(
                          user.last_sign_in_at,
                        )}
                      </p>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#101012]">
          <header className="border-b border-white/10 px-5 py-5 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
              Administración
            </p>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Torneos creados
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Todos los torneos registrados
                  en Esports Bracket Live.
                </p>
              </div>

              {!loadingTournaments &&
                !tournamentsError && (
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-black text-neutral-400">
                    {tournaments.length}{" "}
                    {tournaments.length ===
                    1
                      ? "torneo"
                      : "torneos"}
                  </div>
                )}
            </div>
          </header>

          {loadingTournaments ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

                <p className="mt-4 text-sm font-bold text-neutral-500">
                  Cargando torneos...
                </p>
              </div>
            </div>
          ) : tournamentsError ? (
            <div className="px-6 py-10">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4 text-sm font-semibold text-red-300">
                {tournamentsError}
              </div>
            </div>
          ) : tournaments.length ===
            0 ? (
            <div className="flex min-h-[280px] items-center justify-center px-6 text-center">
              <div>
                <div className="text-4xl">
                  🏆
                </div>

                <h3 className="mt-4 text-lg font-black">
                  No hay torneos
                </h3>

                <p className="mt-2 text-sm text-neutral-600">
                  Todavía no existen torneos
                  registrados.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {tournaments.map(
                (tournament) => {
                  const owner =
                    getTournamentOwner(
                      tournament,
                      users,
                    );

                  return (
                    <article
                      key={tournament.id}
                      className="px-5 py-6 sm:px-6"
                    >
                      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="truncate text-lg font-black text-white">
                              {tournament.name}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getTournamentStatusClasses(
                                tournament.status,
                              )}`}
                            >
                              {tournament.status ||
                                "Sin estado"}
                            </span>
                          </div>

                          <p className="mt-2 truncate font-mono text-[11px] text-neutral-700">
                            {tournament.id}
                          </p>

                          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Juego
                              </p>

                              <p className="mt-1 text-sm font-bold text-neutral-300">
                                {tournament.game ||
                                  "No definido"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Formato
                              </p>

                              <p className="mt-1 text-sm font-bold text-neutral-300">
                                {tournament.format ||
                                  "No definido"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Modalidad
                              </p>

                              <p className="mt-1 text-sm font-bold text-neutral-300">
                                {getTournamentModeLabel(
                                  tournament.mode,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Participantes
                              </p>

                              <p className="mt-1 text-sm font-bold text-neutral-300">
                                {tournament.teams ??
                                  "—"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Propietario
                              </p>

                              {owner ? (
                                <div className="mt-1">
                                  <p className="truncate text-sm font-black text-white">
                                    {getUserDisplayName(
                                      owner,
                                    )}
                                  </p>

                                  {owner.username &&
                                    owner.email && (
                                      <p className="mt-1 truncate text-xs font-semibold text-neutral-500">
                                        {
                                          owner.email
                                        }
                                      </p>
                                    )}
                                </div>
                              ) : (
                                <p className="mt-1 truncate font-mono text-xs text-neutral-500">
                                  {tournament.user_id ||
                                    "Sin propietario"}
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Fecha del torneo
                              </p>

                              <p className="mt-1 text-sm font-semibold text-neutral-400">
                                {formatTournamentDate(
                                  tournament.date,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                                Creado
                              </p>

                              <p className="mt-1 text-sm font-semibold text-neutral-400">
                                {formatDate(
                                  tournament.created_at,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Link
                            href={`/tournaments/${tournament.id}/bracket`}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.07] px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-red-300 transition hover:border-red-500/40 hover:bg-red-500/15 sm:w-auto"
                          >
                            Ver fixture →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-5 py-4">
          <p className="text-xs font-bold leading-6 text-emerald-300/80">
            Panel en modo solo lectura.
            No existen acciones para eliminar,
            suspender o modificar usuarios o
            torneos.
          </p>
        </div>
      </div>
    </main>
  );
}