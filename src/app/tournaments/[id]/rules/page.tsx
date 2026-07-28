"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type TournamentRulesData = {
  id: string;
  user_id: string;
  name: string;
  organization: string | null;
  game: string;
  tournament_type: string | null;
  format: string;
  teams: number;
  date: string | null;
  time: string | null;
  server: string | null;
  description: string | null;
  rules: string | null;
  status: string | null;
  mode: "team" | "individual" | null;
};

function formatTournamentDate(
  value: string | null,
) {
  if (!value) {
    return "Fecha por definir";
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getStatusStyles(
  status: string | null,
) {
  const normalizedStatus =
    status?.trim().toLowerCase() ?? "";

  if (normalizedStatus.includes("finalizado")) {
    return {
      label: status || "Finalizado",
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
      dot: "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.85)]",
    };
  }

  if (normalizedStatus.includes("curso")) {
    return {
      label: status || "En curso",
      className:
        "border-blue-500/30 bg-blue-500/10 text-blue-300",
      dot: "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.85)]",
    };
  }

  if (
    normalizedStatus.includes("inscripciones")
  ) {
    return {
      label:
        status || "Inscripciones abiertas",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]",
    };
  }

  return {
    label: status || "Borrador",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.85)]",
  };
}

export default function TournamentRulesPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  const tournamentId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [tournament, setTournament] =
    useState<TournamentRulesData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadTournament =
    useCallback(async () => {
      if (!tournamentId) {
        setErrorMessage(
          "No se encontró el identificador del torneo.",
        );

        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data,
          error: tournamentError,
        } = await supabase
          .from("tournaments")
          .select(
            `
              id,
              user_id,
              name,
              organization,
              game,
              tournament_type,
              format,
              teams,
              date,
              time,
              server,
              description,
              rules,
              status,
              mode
            `,
          )
          .eq("id", tournamentId)
          .eq("user_id", user.id)
          .single();

        if (tournamentError || !data) {
          throw new Error(
            tournamentError?.message ||
              "No se pudo encontrar el torneo.",
          );
        }

        setTournament(
          data as TournamentRulesData,
        );
      } catch (error) {
        console.error(
          "Error al cargar las reglas:",
          error,
        );

        setTournament(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las reglas.",
        );
      } finally {
        setLoading(false);
      }
    }, [router, tournamentId]);

  useEffect(() => {
    void loadTournament();
  }, [loadTournament]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-semibold text-neutral-400">
            Cargando reglamento...
          </p>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-[#111113] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10 text-2xl font-black text-red-500">
            !
          </div>

          <h1 className="mt-5 text-2xl font-black">
            No se pudo cargar el reglamento
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {errorMessage ||
              "El torneo no existe o no tienes permiso para administrarlo."}
          </p>

          <Link
            href="/tournaments"
            className="mt-7 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Volver a Mis Torneos
          </Link>
        </section>
      </main>
    );
  }

  const isIndividual =
    tournament.mode === "individual";

  const participantLabel = isIndividual
    ? "jugadores"
    : "equipos";

  const statusStyles = getStatusStyles(
    tournament.status,
  );

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-[#0b0b0d]">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/40 bg-red-600/10">
              <span className="text-xl font-black text-red-500">
                D
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-white">
                Dota Bracket
              </p>

              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.28em] text-red-500">
                Live
              </p>
            </div>
          </Link>

          <Link
            href={`/tournaments/${tournament.id}`}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            ← Centro del Torneo
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#19191c] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.15em] ${statusStyles.className}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
                />

                {statusStyles.label}
              </div>

              <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-300">
                Reglamento oficial
              </div>
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-red-500">
              {tournament.organization ||
                "Organización independiente"}
            </p>

            <h1 className="mt-3 max-w-5xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Reglas de {tournament.name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400 sm:text-base">
              Consulta la descripción, las
              condiciones y el reglamento oficial
              de la competencia.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#101012] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                Presentación
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Descripción del torneo
              </h2>

              {tournament.description?.trim() ? (
                <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-black/20 p-5 text-sm leading-7 text-neutral-300">
                  {tournament.description}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
                  <p className="font-bold text-amber-300">
                    No hay una descripción
                    registrada
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-500/70">
                    Puedes agregarla desde la
                    página de edición del torneo.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#101012] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                Normativa
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Reglamento oficial
              </h2>

              {tournament.rules?.trim() ? (
                <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-black/20 p-5 text-sm leading-7 text-neutral-300">
                  {tournament.rules}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
                  <p className="font-bold text-amber-300">
                    Todavía no hay reglas
                    registradas
                  </p>

                  <p className="mt-2 text-sm leading-6 text-amber-500/70">
                    Agrega el reglamento desde la
                    configuración del torneo.
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#101012] p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                Competencia
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                Información general
              </h2>

              <div className="mt-6 divide-y divide-white/[0.07]">
                <InfoRow
                  label="Juego"
                  value={tournament.game}
                />

                <InfoRow
                  label="Formato"
                  value={
                    tournament.format ||
                    "Por definir"
                  }
                />

                <InfoRow
                  label="Modalidad"
                  value={
                    isIndividual
                      ? "Individual"
                      : "Por equipos"
                  }
                />

                <InfoRow
                  label="Participantes"
                  value={`${tournament.teams} ${participantLabel}`}
                />

                <InfoRow
                  label="Fecha"
                  value={formatTournamentDate(
                    tournament.date,
                  )}
                />

                <InfoRow
                  label="Hora"
                  value={
                    tournament.time ||
                    "Por definir"
                  }
                />

                <InfoRow
                  label="Servidor"
                  value={
                    tournament.server ||
                    "Por definir"
                  }
                />

                <InfoRow
                  label="Tipo"
                  value={
                    tournament.tournament_type ||
                    "Por definir"
                  }
                />
              </div>
            </section>

            <Link
              href={`/tournaments/${tournament.id}/edit`}
              className="flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-500"
            >
              Editar descripción y reglas
            </Link>

            <Link
              href={`/tournaments/${tournament.id}/bracket`}
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-black text-neutral-300 transition hover:border-red-500/30 hover:bg-red-600/10 hover:text-white"
            >
              Ver fixture
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0">
      <span className="text-xs font-bold uppercase tracking-[0.13em] text-neutral-600">
        {label}
      </span>

      <span className="max-w-[190px] text-right text-sm font-semibold capitalize text-neutral-300">
        {value}
      </span>
    </div>
  );
}