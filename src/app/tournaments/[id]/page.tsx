"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  organization: string | null;
  game: string;
  tournament_type: string | null;
  format: string;
  teams: number;
  max_players: number | null;
  date: string | null;
  time: string | null;
  server: string | null;
  stream: string | null;
  description: string | null;
  rules: string | null;
  slug: string | null;
  status: string | null;
  banner: string | null;
  mode: "team" | "individual" | null;
};

type RegisteredParticipant = {
  id: string;
  name: string;
  logo: string | null;
  country: string | null;
  captain: string | null;
  created_at: string;
};

type ModuleCardProps = {
  href?: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
};

function ModuleCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  badge,
  disabled = false,
  onClick,
}: ModuleCardProps) {
  const className = `
    group relative min-h-[190px] overflow-hidden rounded-2xl border p-5 text-left
    transition duration-300
    ${
      disabled
        ? "cursor-not-allowed border-white/[0.06] bg-white/[0.015] opacity-55"
        : "border-white/10 bg-[#111114] hover:-translate-y-1 hover:border-red-500/35 hover:bg-[#151518] hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
    }
  `;

  const content = (
    <>
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-600/0 blur-3xl transition duration-300 group-hover:bg-red-600/10" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-2xl shadow-inner">
            {icon}
          </div>

          {badge && (
            <span className="rounded-full border border-red-500/20 bg-red-600/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-500">
            {eyebrow}
          </p>

          <h3 className="mt-2 text-lg font-black text-white">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {description}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <span
            className={`text-xs font-bold uppercase tracking-[0.12em] ${
              disabled
                ? "text-neutral-700"
                : "text-neutral-400 transition group-hover:text-white"
            }`}
          >
            {disabled ? "Próximamente" : "Abrir módulo"}
          </span>

          {!disabled && (
            <span className="text-lg text-red-500 transition duration-300 group-hover:translate-x-1">
              →
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatTournamentDate(date: string | null) {
  if (!date) {
    return "Fecha por definir";
  }

  const normalizedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(normalizedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(normalizedDate);
}

function formatCreatedDate(date: string) {
  const normalizedDate = new Date(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(normalizedDate);
}

function getStatusStyles(status: string | null) {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";

  if (
    normalizedStatus.includes("activo") ||
    normalizedStatus.includes("publicado") ||
    normalizedStatus.includes("en vivo")
  ) {
    return {
      label: status || "Activo",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]",
    };
  }

  if (
    normalizedStatus.includes("finalizado") ||
    normalizedStatus.includes("cerrado")
  ) {
    return {
      label: status || "Finalizado",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-300",
      dot: "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.85)]",
    };
  }

  return {
    label: status || "Borrador",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.85)]",
  };
}

export default function TournamentCenterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tournamentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<RegisteredParticipant[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const loadTournament = useCallback(async () => {
    if (!tournamentId) {
      setErrorMessage("No se encontró el identificador del torneo.");
      setLoadingPage(false);
      return;
    }

    setLoadingPage(true);
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

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .eq("user_id", user.id)
        .single();

      if (tournamentError || !tournamentData) {
        throw new Error(
          tournamentError?.message ||
            "No se pudo encontrar el torneo solicitado.",
        );
      }

      const { data: participantsData, error: participantsError } =
        await supabase
          .from("teams")
          .select("id, name, logo, country, captain, created_at")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false });

      if (participantsError) {
        throw participantsError;
      }

      setTournament(tournamentData as Tournament);
      setParticipants(
        (participantsData ?? []) as RegisteredParticipant[],
      );
    } catch (error) {
      console.error("Error al cargar el centro del torneo:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la información del torneo.",
      );
    } finally {
      setLoadingPage(false);
    }
  }, [router, tournamentId]);

  useEffect(() => {
    void loadTournament();
  }, [loadTournament]);

  const participantLimit = tournament?.teams ?? 0;
  const registeredParticipants = participants.length;
  const remainingParticipants = Math.max(
    participantLimit - registeredParticipants,
    0,
  );

  const progress = useMemo(() => {
    if (!participantLimit) {
      return 0;
    }

    return Math.min(
      Math.round((registeredParticipants / participantLimit) * 100),
      100,
    );
  }, [participantLimit, registeredParticipants]);

  const tournamentIsFull =
    participantLimit > 0 && registeredParticipants >= participantLimit;

  const isIndividual = tournament?.mode === "individual";
  const participantSingular = isIndividual ? "jugador" : "equipo";
  const participantPlural = isIndividual ? "jugadores" : "equipos";

  const recentParticipants = participants.slice(0, 5);
  const statusStyles = getStatusStyles(tournament?.status ?? null);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Enlace copiado");

      window.setTimeout(() => {
        setCopyMessage("");
      }, 2500);
    } catch (error) {
      console.error("No se pudo copiar el enlace:", error);
      setCopyMessage("No se pudo copiar");
    }
  }

  if (loadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-semibold text-neutral-400">
            Preparando el centro del torneo...
          </p>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-[#111113] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10 text-2xl font-black text-red-500">
            !
          </div>

          <h1 className="mt-5 text-2xl font-black">
            No se pudo cargar el torneo
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {errorMessage ||
              "El torneo no existe o no tienes permisos para administrarlo."}
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Volver al Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-[#0b0b0d]">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/40 bg-red-600/10 shadow-[0_0_25px_rgba(220,38,38,0.15)]">
              <span className="text-xl font-black text-red-500">D</span>
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

          <div className="flex items-center gap-3">
            <Link
              href="/tournaments"
              className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white sm:inline-flex"
            >
              ← Mis torneos
            </Link>

            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-500"
            >
              {copyMessage || "Compartir"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative min-h-[430px] overflow-hidden rounded-[30px] border border-white/10 bg-[#111113] shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={
              tournament.banner
                ? {
                    backgroundImage: `url("${tournament.banner}")`,
                  }
                : {
                    backgroundImage:
                      "radial-gradient(circle at 78% 15%, rgba(220,38,38,0.22), transparent 28%), radial-gradient(circle at 14% 90%, rgba(120,53,15,0.18), transparent 34%), linear-gradient(135deg, #1b1b20 0%, #0f0f12 48%, #080809 100%)",
                  }
            }
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />

          <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full border border-red-500/10" />
          <div className="pointer-events-none absolute -right-10 top-24 h-56 w-56 rounded-full border border-red-500/10" />

          <div className="relative z-10 flex min-h-[430px] flex-col justify-end p-6 sm:p-8 lg:p-12">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.15em] ${statusStyles.className}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
                  />

                  {statusStyles.label}
                </div>

                <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-300 backdrop-blur">
                  {isIndividual ? "Torneo individual" : "Torneo por equipos"}
                </div>
              </div>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-red-500">
                {tournament.organization || "Organización independiente"}
              </p>

              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                {tournament.name}
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
                {tournament.description ||
                  `Administra los ${participantPlural}, prepara el fixture y organiza todos los detalles de tu torneo desde un solo lugar.`}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/tournaments/${tournament.id}/teams`}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_35px_rgba(220,38,38,0.25)] transition hover:-translate-y-0.5 hover:bg-red-500"
                >
                  Administrar {participantPlural}
                </Link>

                <Link
                  href={`/tournaments/${tournament.id}/bracket`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/30 px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10"
                >
                  Ver fixture
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 -mt-5 mx-4 grid gap-3 sm:grid-cols-2 lg:mx-8 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              Juego
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {tournament.game}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {tournament.format || "Formato por definir"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              Participantes
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {registeredParticipants}
              <span className="text-neutral-600"> / {participantLimit}</span>
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {tournamentIsFull
                ? "Cupos completos"
                : `${remainingParticipants} cupos disponibles`}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              Fecha
            </p>

            <p className="mt-2 line-clamp-1 text-lg font-black capitalize text-white">
              {formatTournamentDate(tournament.date)}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {tournament.time ? `${tournament.time} horas` : "Hora por definir"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              Región / servidor
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {tournament.server || "Por definir"}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {tournament.tournament_type || "Eliminación"}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#101012] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                Preparación del torneo
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Registro de {participantPlural}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                {tournamentIsFull
                  ? `Ya están registrados todos los ${participantPlural}. El torneo está listo para avanzar al fixture.`
                  : `Registra los ${remainingParticipants} ${participantPlural} restantes para completar todos los cupos.`}
              </p>
            </div>

            <div className="shrink-0 text-left lg:text-right">
              <p className="text-4xl font-black text-white">
                {progress}
                <span className="text-xl text-red-500">%</span>
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-neutral-600">
                Completado
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-600 to-red-400 shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-neutral-500">
              {registeredParticipants} {participantPlural} registrados
            </span>

            <span
              className={
                tournamentIsFull ? "text-emerald-400" : "text-amber-400"
              }
            >
              {tournamentIsFull
                ? "Listo para generar el fixture"
                : `Faltan ${remainingParticipants} cupos`}
            </span>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                Centro de control
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Administración del torneo
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Accede rápidamente a cada área del evento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadTournament()}
              className="w-fit rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Actualizar información
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ModuleCard
              href={`/tournaments/${tournament.id}/teams`}
              icon={isIndividual ? "♟" : "👥"}
              eyebrow="Participantes"
              title={isIndividual ? "Jugadores" : "Equipos"}
              description={`Registra, organiza y administra los ${participantPlural} que competirán en el torneo.`}
              badge={`${registeredParticipants}/${participantLimit}`}
            />

            <ModuleCard
              href={`/tournaments/${tournament.id}/bracket`}
              icon="🏆"
              eyebrow="Competencia"
              title="Fixture"
              description="Genera las rondas, organiza los enfrentamientos y define al campeón."
              badge={tournamentIsFull ? "Disponible" : "Pendiente"}
            />

            <ModuleCard
              href={`/tournaments/${tournament.id}/matches`}
              icon="⚔"
              eyebrow="Resultados"
              title="Partidos"
              description="Consulta los encuentros pendientes, en vivo y finalizados del torneo."
              disabled
            />

            <ModuleCard
              href={`/tournaments/${tournament.id}/stream`}
              icon="▣"
              eyebrow="Transmisión"
              title="Stream"
              description="Configura los canales oficiales y enlaces de transmisión del evento."
              disabled
            />

            <ModuleCard
              href={`/tournaments/${tournament.id}/rules`}
              icon="📜"
              eyebrow="Información"
              title="Reglas"
              description="Publica el reglamento, condiciones y formato oficial de la competencia."
              disabled
            />

            <ModuleCard
              href={`/tournaments/${tournament.id}/staff`}
              icon="♜"
              eyebrow="Organización"
              title="Staff"
              description="Administra organizadores, árbitros, streamers y colaboradores."
              disabled
            />

            <ModuleCard
              href={`/tournaments/${tournament.id}/settings`}
              icon="⚙"
              eyebrow="Configuración"
              title="Ajustes"
              description="Edita la información general, fechas, estado y apariencia del torneo."
              disabled
            />

            <ModuleCard
              icon="🔗"
              eyebrow="Difusión"
              title="Compartir torneo"
              description="Copia el enlace del centro del torneo para compartirlo rápidamente."
              onClick={handleCopyLink}
              badge={copyMessage || undefined}
            />
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-[#101012] p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
                  Participantes
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  Últimos registros
                </h2>
              </div>

              <Link
                href={`/tournaments/${tournament.id}/teams`}
                className="text-xs font-black uppercase tracking-[0.12em] text-neutral-500 transition hover:text-red-400"
              >
                Ver todos →
              </Link>
            </div>

            {recentParticipants.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.025] text-2xl text-neutral-600">
                  ⚔
                </div>

                <h3 className="mt-5 text-base font-black text-neutral-300">
                  Aún no hay {participantPlural}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
                  Registra al primer participante para comenzar a preparar el
                  torneo.
                </p>

                <Link
                  href={`/tournaments/${tournament.id}/teams`}
                  className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-red-500"
                >
                  Registrar {participantSingular}
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentParticipants.map((participant, index) => (
                  <article
                    key={participant.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.025]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#18181b]">
                      {participant.logo ? (
                        <img
                          src={participant.logo}
                          alt={`${isIndividual ? "Avatar" : "Logo"} de ${
                            participant.name
                          }`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-black text-red-400">
                          {getInitials(participant.name) ||
                            (isIndividual ? "JG" : "EQ")}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">
                        {participant.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-neutral-600">
                        {participant.country || "País no especificado"}
                        {!isIndividual && participant.captain
                          ? ` • Capitán: ${participant.captain}`
                          : ""}
                      </p>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-700">
                        Registro {registeredParticipants - index}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-neutral-500">
                        {formatCreatedDate(participant.created_at)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#18181b] to-[#0e0e10] p-6 sm:p-8">
            <div className="flex h-full min-h-[360px] flex-col">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">
                  Estado general
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  Próximo objetivo
                </h2>
              </div>

              <div className="mt-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-600/10 text-4xl shadow-[0_0_35px_rgba(220,38,38,0.12)]">
                {tournamentIsFull ? "🏆" : "⚔"}
              </div>

              <h3 className="mt-6 text-2xl font-black text-white">
                {tournamentIsFull
                  ? "Generar el fixture"
                  : `Completar los ${participantPlural}`}
              </h3>

              <p className="mt-3 text-sm leading-7 text-neutral-500">
                {tournamentIsFull
                  ? "Todos los cupos fueron completados. Ya puedes comenzar a organizar los enfrentamientos y rondas del torneo."
                  : `Actualmente tienes ${registeredParticipants} de ${participantLimit} ${participantPlural}. Completa los registros para desbloquear el fixture.`}
              </p>

              <div className="mt-auto pt-8">
                {tournamentIsFull ? (
                  <Link
                    href={`/tournaments/${tournament.id}/bracket`}
                    className="flex w-full items-center justify-center rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_16px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500"
                  >
                    Crear fixture →
                  </Link>
                ) : (
                  <Link
                    href={`/tournaments/${tournament.id}/teams`}
                    className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-black uppercase tracking-[0.1em] text-white transition hover:border-red-500/30 hover:bg-red-600/10"
                  >
                    Registrar {participantPlural} →
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-8 flex flex-col gap-4 border-t border-white/10 py-6 text-xs text-neutral-700 sm:flex-row sm:items-center sm:justify-between">
          <p>Dota Bracket Live · Centro de administración del torneo</p>

          <p>
            Torneo creado el{" "}
            {new Intl.DateTimeFormat("es-BO", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(new Date(tournament.created_at))}
          </p>
        </footer>
      </div>
    </main>
  );
}