"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type RulesTabProps = {
  tournamentId: string;
};

type TournamentRules = {
  id: string;
  name: string;
  organization: string | null;
  game: string | null;
  format: string | null;
  mode: "team" | "individual" | null;
  teams: number | null;
  date: string | null;
  time: string | null;
  server: string | null;
  description: string | null;
  rules: string | null;
  status: string | null;
};

function formatTournamentDate(
  value: string | null,
) {
  if (!value) {
    return "Por definir";
  }

  const normalizedValue =
    value.includes("T")
      ? value
      : `${value}T12:00:00`;

  const date =
    new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTournamentTime(
  value: string | null,
) {
  if (!value) {
    return "Por definir";
  }

  return value.slice(0, 5);
}

function formatTournamentMode(
  mode: TournamentRules["mode"],
) {
  return mode === "individual"
    ? "Individual"
    : "Por equipos";
}

function formatTournamentFormat(
  value: string | null,
) {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("_", "-")
      .replaceAll(" ", "-");

  if (
    normalized === "single" ||
    normalized === "single-elimination" ||
    normalized === "eliminacion-simple"
  ) {
    return "Eliminación simple";
  }

  if (
    normalized === "double" ||
    normalized === "double-elimination" ||
    normalized === "eliminacion-doble"
  ) {
    return "Eliminación doble";
  }

  return value?.trim() || "Por definir";
}

function getStatusClasses(
  status: string | null,
) {
  const normalized =
    String(status ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "finalizado") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "en curso") {
    return "border-blue-500/25 bg-blue-500/10 text-blue-300";
  }

  if (
    normalized.includes("inscripciones")
  ) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/10 bg-white/[0.04] text-neutral-400";
}

export default function RulesTab({
  tournamentId,
}: RulesTabProps) {
  const [tournament, setTournament] =
    useState<TournamentRules | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data,
          error,
        } = await supabase
          .from("tournaments")
          .select(
            `
              id,
              name,
              organization,
              game,
              format,
              mode,
              teams,
              date,
              time,
              server,
              description,
              rules,
              status
            `,
          )
          .eq("id", tournamentId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error(
            "No se encontró la información del torneo.",
          );
        }

        if (!cancelled) {
          setTournament(
            data as TournamentRules,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setTournament(null);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el reglamento.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRules();

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
        <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-[#050a10]">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

            <p className="mt-4 text-sm font-bold text-neutral-500">
              Cargando reglamento...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!tournament) {
    return (
      <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
        <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-red-500/20 bg-[#050a10] px-6 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-xl font-black text-red-400">
              !
            </div>

            <h2 className="mt-5 text-xl font-black text-white">
              No se pudo cargar el reglamento
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              {errorMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const participantWord =
    tournament.mode === "individual"
      ? "jugadores"
      : "equipos";

  return (
    <section className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#050a10] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#17191f] via-[#0b0f15] to-[#05070b] px-5 py-7 sm:px-7 lg:px-9">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-red-300">
                  Reglamento oficial
                </span>

                <span
                  className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${getStatusClasses(
                    tournament.status,
                  )}`}
                >
                  {tournament.status ||
                    "Sin estado"}
                </span>
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-red-500">
                {tournament.organization ||
                  "Organización independiente"}
              </p>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                Reglas de {tournament.name}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">
                Información pública para todos los participantes y espectadores del torneo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard
                label="Juego"
                value={
                  tournament.game ||
                  "Por definir"
                }
              />

              <SummaryCard
                label="Formato"
                value={formatTournamentFormat(
                  tournament.format,
                )}
              />

              <SummaryCard
                label="Modalidad"
                value={formatTournamentMode(
                  tournament.mode,
                )}
              />

              <SummaryCard
                label="Participantes"
                value={`${
                  tournament.teams ?? 0
                } ${participantWord}`}
              />
            </div>
          </div>
        </header>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
          <div className="space-y-6">
            <RulesSection
              eyebrow="Presentación"
              title="Descripción del torneo"
              content={tournament.description}
              emptyTitle="Descripción no registrada"
              emptyText="El organizador todavía no agregó una descripción pública para este torneo."
            />

            <RulesSection
              eyebrow="Normativa"
              title="Reglamento oficial"
              content={tournament.rules}
              emptyTitle="Reglamento pendiente"
              emptyText="El organizador todavía no publicó las reglas generales de la competencia."
              highlighted
            />
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#0b1017] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                Información del evento
              </p>

              <div className="mt-5 divide-y divide-white/[0.07]">
                <InformationRow
                  label="Fecha"
                  value={formatTournamentDate(
                    tournament.date,
                  )}
                />

                <InformationRow
                  label="Hora"
                  value={formatTournamentTime(
                    tournament.time,
                  )}
                />

                <InformationRow
                  label="Servidor"
                  value={
                    tournament.server ||
                    "Por definir"
                  }
                />

                <InformationRow
                  label="Estado"
                  value={
                    tournament.status ||
                    "Sin estado"
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
              <p className="text-sm font-black text-amber-300">
                Importante
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-200/60">
                Participar en el torneo implica conocer y aceptar estas reglas. Las decisiones del organizador se aplicarán conforme al reglamento publicado.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[135px] rounded-xl border border-white/10 bg-black/25 px-4 py-3">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-neutral-600">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-xs font-black text-neutral-200">
        {value}
      </p>
    </div>
  );
}

function RulesSection({
  eyebrow,
  title,
  content,
  emptyTitle,
  emptyText,
  highlighted = false,
}: {
  eyebrow: string;
  title: string;
  content: string | null;
  emptyTitle: string;
  emptyText: string;
  highlighted?: boolean;
}) {
  const normalizedContent =
    content?.trim() || "";

  return (
    <article
      className={`rounded-2xl border p-5 sm:p-6 ${
        highlighted
          ? "border-red-500/20 bg-red-500/[0.035]"
          : "border-white/10 bg-[#0b1017]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
        {eyebrow}
      </p>

      <h3 className="mt-2 text-xl font-black text-white">
        {title}
      </h3>

      {normalizedContent ? (
        <div className="mt-5 whitespace-pre-wrap rounded-xl border border-white/[0.07] bg-black/25 p-5 text-sm leading-7 text-neutral-300">
          {normalizedContent}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
          <p className="text-sm font-black text-amber-300">
            {emptyTitle}
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-200/60">
            {emptyText}
          </p>
        </div>
      )}
    </article>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0">
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600">
        {label}
      </span>

      <span className="max-w-[220px] text-right text-sm font-bold text-neutral-300">
        {value}
      </span>
    </div>
  );
}