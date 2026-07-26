"use client";

import Link from "next/link";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { ORGANIZATIONS } from "@/lib/organizations";
import {
  getBracket,
  saveBracket as saveBracketToSupabase,
} from "@/lib/bracketStorage";
import type { TournamentBracket } from "@/lib/bracket";

type TournamentMode = "team" | "individual";

type TournamentRow = {
  id: string;
  user_id: string;
  name: string;
  organization: string | null;
  game: string;
  tournament_type: string | null;
  format: string;
  mode: TournamentMode | null;
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
};

type FormData = {
  name: string;
  organization: string;
  customOrganization: string;
  game: string;
  tournamentType: string;
  format: string;
  mode: TournamentMode;
  teams: number;
  date: string;
  time: string;
  server: string;
  stream: string;
  description: string;
  rules: string;
  status: string;
};

const initialFormData: FormData = {
  name: "",
  organization: "W3Arena",
  customOrganization: "",
  game: "Dota 1",
  tournamentType: "Comunitario",
  format: "Eliminación simple",
  mode: "team",
  teams: 8,
  date: "",
  time: "",
  server: "Sudamérica",
  stream: "",
  description: "",
  rules: "",
  status: "Borrador",
};

const tournamentTypes = [
  "Oficial",
  "Comunitario",
  "Amateur",
  "Profesional",
  "Clasificatorio",
  "Liga",
  "Copa",
  "Showmatch",
  "Benéfico",
  "Torneo de streamers",
];

const servers = [
  "Sudamérica",
  "Bolivia",
  "Perú",
  "Brasil",
  "Argentina",
  "Chile",
  "Estados Unidos",
  "USEast",
  "USWest",
  "Europa",
  "Asia",
  "Servidor personalizado",
  "Por definir",
];

const statuses = [
  "Borrador",
  "Inscripciones abiertas",
  "Próximamente",
  "En curso",
  "Finalizado",
];

function normalizeTime(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function normalizeNullableText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isKnownOrganization(value: string) {
  return ORGANIZATIONS.some(
    (organization) => organization.value === value,
  );
}

export default function EditTournamentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tournamentId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [tournament, setTournament] =
    useState<TournamentRow | null>(null);
  const [formData, setFormData] =
    useState<FormData>(initialFormData);
  const [bracketStarted, setBracketStarted] =
    useState(false);
  const [loadingPage, setLoadingPage] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const organizationName = useMemo(() => {
    if (formData.organization === "Otra") {
      return formData.customOrganization.trim();
    }

    return formData.organization.trim();
  }, [formData.organization, formData.customOrganization]);

  const participantLabel =
    formData.mode === "individual" ? "jugadores" : "equipos";

  const loadTournament = useCallback(async () => {
    if (!tournamentId) {
      setErrorMessage(
        "No se encontró el identificador del torneo.",
      );
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

      const {
        data: tournamentData,
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
            mode,
            teams,
            max_players,
            date,
            time,
            server,
            stream,
            description,
            rules,
            slug,
            status,
            banner
          `,
        )
        .eq("id", tournamentId)
        .eq("user_id", user.id)
        .single();

      if (tournamentError || !tournamentData) {
        throw new Error(
          tournamentError?.message ||
            "No se encontró el torneo o no tienes permiso para editarlo.",
        );
      }

      const loadedTournament =
        tournamentData as TournamentRow;
      const savedBracket = await getBracket(tournamentId);
      const storedOrganization =
        loadedTournament.organization?.trim() || "W3Arena";
      const organizationIsKnown =
        isKnownOrganization(storedOrganization);

      setTournament(loadedTournament);
      setBracketStarted(Boolean(savedBracket));
      setFormData({
        name: loadedTournament.name ?? "",
        organization: organizationIsKnown
          ? storedOrganization
          : "Otra",
        customOrganization: organizationIsKnown
          ? ""
          : storedOrganization,
        game: loadedTournament.game || "Dota 1",
        tournamentType:
          loadedTournament.tournament_type || "Comunitario",
        format:
          loadedTournament.format || "Eliminación simple",
        mode: loadedTournament.mode || "team",
        teams:
          loadedTournament.teams ||
          loadedTournament.max_players ||
          8,
        date: loadedTournament.date || "",
        time: normalizeTime(loadedTournament.time),
        server: loadedTournament.server || "Sudamérica",
        stream: loadedTournament.stream || "",
        description: loadedTournament.description || "",
        rules: loadedTournament.rules || "",
        status: loadedTournament.status || "Borrador",
      });
    } catch (error) {
      console.error(
        "Error al cargar la información del torneo:",
        error,
      );

      setTournament(null);
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

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  }

  function validateForm() {
    if (!formData.name.trim()) {
      return "Escribe el nombre del torneo.";
    }

    if (formData.name.trim().length < 4) {
      return "El nombre del torneo debe tener al menos 4 caracteres.";
    }

    if (!organizationName) {
      return "Escribe el nombre de la organización.";
    }

    if (!formData.tournamentType) {
      return "Selecciona el tipo de torneo.";
    }

    if (!formData.date) {
      return "Selecciona la fecha de inicio.";
    }

    if (!formData.time) {
      return "Selecciona la hora de inicio.";
    }

    if (!formData.server) {
      return "Selecciona el servidor.";
    }

    if (
      formData.stream.trim() &&
      !/^https?:\/\/.+/i.test(formData.stream.trim())
    ) {
      return "El enlace del stream debe comenzar con http:// o https://.";
    }

    if (
      !bracketStarted &&
      ![8, 16, 32, 64].includes(formData.teams)
    ) {
      return `Selecciona una cantidad válida de ${participantLabel}.`;
    }

    return "";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!tournament || saving) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const updatePayload: Record<
        string,
        string | number | null
      > = {
        name: formData.name.trim(),
        organization: organizationName,
        tournament_type: formData.tournamentType,
        date: formData.date,
        time: formData.time,
        server: formData.server,
        stream: normalizeNullableText(formData.stream),
        description: normalizeNullableText(
          formData.description,
        ),
        rules: normalizeNullableText(formData.rules),
        status: formData.status,
      };

      /*
       * Cuando el fixture ya existe, estos campos quedan
       * protegidos para no cambiar su estructura ni sus avances.
       */
      if (!bracketStarted) {
        updatePayload.game = formData.game;
        updatePayload.format = formData.format;
        updatePayload.mode = formData.mode;
        updatePayload.teams = formData.teams;
        updatePayload.max_players = formData.teams;
      }

      const { error: updateError } = await supabase
        .from("tournaments")
        .update(updatePayload)
        .eq("id", tournament.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          updateError.message ||
            "No se pudo actualizar el torneo.",
        );
      }

      /*
       * Mantiene actualizado el nombre interno del fixture
       * sin tocar partidos, resultados, posiciones ni campeón.
       */
      const savedBracket = await getBracket(tournament.id);

      if (
        savedBracket &&
        savedBracket.tournamentName !==
          formData.name.trim()
      ) {
        const updatedBracket = {
          ...savedBracket,
          tournamentName: formData.name.trim(),
          updatedAt: new Date().toISOString(),
        } as unknown as TournamentBracket;

        try {
          await saveBracketToSupabase(
            tournament.id,
            updatedBracket,
          );
        } catch (bracketError) {
          console.error(
            "La información se guardó, pero no se pudo actualizar el nombre interno del fixture:",
            bracketError,
          );
        }
      }

      setTournament((current) =>
        current
          ? {
              ...current,
              name: formData.name.trim(),
              organization: organizationName,
              tournament_type: formData.tournamentType,
              date: formData.date,
              time: formData.time,
              server: formData.server,
              stream: normalizeNullableText(formData.stream),
              description: normalizeNullableText(
                formData.description,
              ),
              rules: normalizeNullableText(formData.rules),
              status: formData.status,
              ...(!bracketStarted
                ? {
                    game: formData.game,
                    format: formData.format,
                    mode: formData.mode,
                    teams: formData.teams,
                    max_players: formData.teams,
                  }
                : {}),
            }
          : current,
      );

      setSuccessMessage(
        bracketStarted
          ? "La información del torneo fue actualizada sin modificar la estructura ni los avances del fixture."
          : "La información del torneo fue actualizada correctamente.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Error al actualizar el torneo:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el torneo.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />
          <p className="mt-5 text-sm font-semibold text-neutral-400">
            Cargando información del torneo...
          </p>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-[#111113] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10 text-2xl text-red-500">
            !
          </div>
          <h1 className="mt-5 text-2xl font-black">
            No se pudo cargar el torneo
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            {errorMessage ||
              "El torneo no existe o no tienes permiso para editarlo."}
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
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/40 bg-red-600/10 shadow-[0_0_25px_rgba(220,38,38,0.15)]">
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
            href={`/tournaments/${tournament.id}/bracket`}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            ← Volver al fixture
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#19191c] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-600/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Administración del torneo
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Editar información del{" "}
              <span className="text-red-500">torneo</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              Modifica los datos públicos y administrativos de{" "}
              <strong className="text-neutral-200">
                {tournament.name}
              </strong>
              .
            </p>
          </div>
        </section>

        {(errorMessage || successMessage) && (
          <div className="mt-6 space-y-3">
            {errorMessage && (
              <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-5 py-4 text-sm font-medium text-red-300">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                    !
                  </span>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-5 py-4 text-sm font-medium text-emerald-300">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                    ✓
                  </span>
                  <p>{successMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {bracketStarted && (
          <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-5 py-4">
            <p className="font-bold text-amber-300">
              Fixture en curso
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-500/70">
              El juego, la modalidad, el formato y la cantidad de participantes están protegidos para conservar todos los partidos, resultados y avances. Los demás datos sí pueden editarse normalmente.
            </p>
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Información general"
                title="Identidad del torneo"
                description="Actualiza el nombre, la organización, el tipo y el estado del evento."
              />

              <div className="mt-6 grid gap-5">
                <FieldLabel label="Nombre del torneo" required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    disabled={saving}
                    maxLength={100}
                    className={inputClassName}
                  />
                </FieldLabel>

                <div className="grid gap-5 md:grid-cols-2">
                  <FieldLabel label="Organización" required>
                    <select
                      value={formData.organization}
                      onChange={(event) =>
                        updateField(
                          "organization",
                          event.target.value,
                        )
                      }
                      disabled={saving}
                      className={selectClassName}
                    >
                      {ORGANIZATIONS.map((organization) => (
                        <option
                          key={organization.value}
                          value={organization.value}
                        >
                          {organization.label} — {organization.category}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>

                  <FieldLabel label="Tipo de torneo" required>
                    <select
                      value={formData.tournamentType}
                      onChange={(event) =>
                        updateField(
                          "tournamentType",
                          event.target.value,
                        )
                      }
                      disabled={saving}
                      className={selectClassName}
                    >
                      {tournamentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>

                {formData.organization === "Otra" && (
                  <FieldLabel
                    label="Nombre de la organización"
                    required
                  >
                    <input
                      type="text"
                      value={formData.customOrganization}
                      onChange={(event) =>
                        updateField(
                          "customOrganization",
                          event.target.value,
                        )
                      }
                      disabled={saving}
                      maxLength={80}
                      className={inputClassName}
                    />
                  </FieldLabel>
                )}

                <FieldLabel label="Estado del torneo">
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    disabled={saving}
                    className={selectClassName}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Competencia"
                title="Juego y estructura"
                description={
                  bracketStarted
                    ? "Estos valores están bloqueados porque el fixture ya existe."
                    : "Puedes modificarlos mientras todavía no exista un fixture."
                }
              />

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <FieldLabel label="Juego" required>
                  <select
                    value={formData.game}
                    onChange={(event) =>
                      updateField("game", event.target.value)
                    }
                    disabled={saving || bracketStarted}
                    className={selectClassName}
                  >
                    <option value="Dota 1">Dota 1</option>
                    <option value="Dota 2">Dota 2</option>
                  </select>
                </FieldLabel>

                <FieldLabel label="Modalidad" required>
                  <select
                    value={formData.mode}
                    onChange={(event) =>
                      updateField(
                        "mode",
                        event.target.value as TournamentMode,
                      )
                    }
                    disabled={saving || bracketStarted}
                    className={selectClassName}
                  >
                    <option value="team">Por equipos</option>
                    <option value="individual">
                      Individual (1 vs 1)
                    </option>
                  </select>
                </FieldLabel>

                <FieldLabel label="Formato" required>
                  <select
                    value={formData.format}
                    onChange={(event) =>
                      updateField("format", event.target.value)
                    }
                    disabled={saving || bracketStarted}
                    className={selectClassName}
                  >
                    <option value="Eliminación simple">
                      Eliminación simple
                    </option>
                    <option value="Eliminación doble">
                      Eliminación doble
                    </option>
                  </select>
                </FieldLabel>

                <FieldLabel
                  label={`Cantidad de ${participantLabel}`}
                  required
                >
                  <select
                    value={formData.teams}
                    onChange={(event) =>
                      updateField(
                        "teams",
                        Number(event.target.value),
                      )
                    }
                    disabled={saving || bracketStarted}
                    className={selectClassName}
                  >
                    {[8, 16, 32, 64].map((amount) => (
                      <option key={amount} value={amount}>
                        {amount} {participantLabel}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Programación"
                title="Fecha y conexión"
                description="Modifica la fecha, la hora, el servidor y el stream oficial."
              />

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <FieldLabel label="Fecha de inicio" required>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      updateField("date", event.target.value)
                    }
                    disabled={saving}
                    className={selectClassName}
                  />
                </FieldLabel>

                <FieldLabel label="Hora de inicio" required>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(event) =>
                      updateField("time", event.target.value)
                    }
                    disabled={saving}
                    className={selectClassName}
                  />
                </FieldLabel>

                <FieldLabel label="Servidor o región" required>
                  <select
                    value={formData.server}
                    onChange={(event) =>
                      updateField("server", event.target.value)
                    }
                    disabled={saving}
                    className={selectClassName}
                  >
                    {servers.map((server) => (
                      <option key={server} value={server}>
                        {server}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="Stream oficial">
                  <input
                    type="url"
                    value={formData.stream}
                    onChange={(event) =>
                      updateField("stream", event.target.value)
                    }
                    disabled={saving}
                    placeholder="https://youtube.com/..."
                    className={inputClassName}
                  />
                </FieldLabel>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Información adicional"
                title="Descripción y reglas"
                description="Actualiza la información pública y las reglas generales."
              />

              <div className="mt-6 space-y-5">
                <FieldLabel label="Descripción">
                  <textarea
                    value={formData.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    rows={5}
                    maxLength={1000}
                    className={`${inputClassName} resize-y leading-6`}
                  />
                </FieldLabel>

                <FieldLabel label="Reglas generales">
                  <textarea
                    value={formData.rules}
                    onChange={(event) =>
                      updateField("rules", event.target.value)
                    }
                    disabled={saving}
                    rows={8}
                    maxLength={5000}
                    className={`${inputClassName} resize-y leading-6`}
                  />
                </FieldLabel>
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <SectionHeader
                eyebrow="Vista previa"
                title="Resumen del torneo"
              />

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#171719] to-[#09090a]">
                <div className="border-b border-white/10 bg-red-600/10 px-5 py-4">
                  <span className="inline-flex rounded-full border border-red-500/30 bg-red-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-300">
                    {formData.status}
                  </span>
                  <h3 className="mt-4 break-words text-xl font-black text-white">
                    {formData.name.trim() || "Nombre del torneo"}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    {organizationName || "Organización"}
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <PreviewItem label="Juego" value={formData.game} />
                  <PreviewItem
                    label="Formato"
                    value={formData.format}
                  />
                  <PreviewItem
                    label="Modalidad"
                    value={
                      formData.mode === "individual"
                        ? "Individual (1 vs 1)"
                        : "Por equipos"
                    }
                  />
                  <PreviewItem
                    label="Participantes"
                    value={`${formData.teams} ${participantLabel}`}
                  />
                  <PreviewItem
                    label="Tipo"
                    value={formData.tournamentType}
                  />
                  <PreviewItem
                    label="Fecha"
                    value={formData.date || "Por definir"}
                  />
                  <PreviewItem
                    label="Hora"
                    value={formData.time || "Por definir"}
                  />
                  <PreviewItem
                    label="Servidor"
                    value={formData.server}
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Guardando cambios...
                </>
              ) : (
                <>
                  <span className="text-lg leading-none">✓</span>
                  Guardar cambios
                </>
              )}
            </button>

            <Link
              href={`/tournaments/${tournament.id}/bracket`}
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar y volver al fixture
            </Link>
          </aside>
        </form>
      </div>
    </main>
  );
}

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50";

const selectClassName =
  "w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50";

type FieldLabelProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

function FieldLabel({
  label,
  required = false,
  children,
}: FieldLabelProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-300">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>
      {children}
    </label>
  );
}

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="border-b border-white/10 pb-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-bold text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {description}
        </p>
      )}
    </div>
  );
}

type PreviewItemProps = {
  label: string;
  value: string;
};

function PreviewItem({ label, value }: PreviewItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
        {label}
      </span>
      <span className="max-w-[60%] break-words text-right text-sm font-semibold text-neutral-300">
        {value}
      </span>
    </div>
  );
}