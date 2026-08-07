"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { supabase } from "@/lib/supabase";
import { ORGANIZATIONS } from "@/lib/organizations";

type FormData = {
  name: string;
  organization: string;
  customOrganization: string;
  game: string;
  customGame: string;
  tournamentType: string;
  format: string;
  mode: "team" | "individual";
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
  customGame: "",
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
];

const games = [
  {
    value: "Dota 1",
    title: "Dota 1",
    description: "Warcraft III: The Frozen Throne",
  },
  {
    value: "Dota 2",
    title: "Dota 2",
    description: "Valve — Steam",
  },
  {
    value: "League of Legends",
    title: "League of Legends",
    description: "Riot Games",
  },
  {
    value: "Heroes of the Storm",
    title: "Heroes of the Storm",
    description: "Blizzard Entertainment",
  },
  {
    value: "Mobile Legends",
    title: "Mobile Legends",
    description: "Bang Bang",
  },
  {
    value: "Valorant",
    title: "Valorant",
    description: "Riot Games",
  },
  {
    value: "Counter-Strike 2",
    title: "Counter-Strike 2",
    description: "Valve — Steam",
  },
  {
    value: "Warcraft III",
    title: "Warcraft III",
    description: "Blizzard Entertainment",
  },
  {
    value: "StarCraft II",
    title: "StarCraft II",
    description: "Blizzard Entertainment",
  },
  {
    value: "Rocket League",
    title: "Rocket League",
    description: "Epic Games",
  },
  {
    value: "EA Sports FC",
    title: "EA Sports FC",
    description: "Electronic Arts",
  },
  {
    value: "Otro",
    title: "Otro juego",
    description: "Escribe el nombre manualmente",
  },
] as const;

function createSlug(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const uniqueSuffix = Date.now().toString(36).slice(-6);

  return `${normalized || "torneo"}-${uniqueSuffix}`;
}

export default function CreateTournamentPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const organizationName = useMemo(() => {
    if (formData.organization === "Otra") {
      return formData.customOrganization.trim();
    }

    return formData.organization;
  }, [formData.organization, formData.customOrganization]);

  const selectedGameName = useMemo(() => {
    if (formData.game === "Otro") {
      return (formData.customGame ?? "").trim();
    }

    return formData.game;
  }, [formData.game, formData.customGame]);

  const selectedGameDescription = useMemo(() => {
    return (
      games.find((game) => game.value === formData.game)?.description ?? ""
    );
  }, [formData.game]);

  const previewSlug = useMemo(() => {
    return formData.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }, [formData.name]);

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

    if (!formData.game) {
      return "Selecciona el juego.";
    }

    if (
      formData.game === "Otro" &&
      !(formData.customGame ?? "").trim()
    ) {
      return "Escribe el nombre del juego.";
    }

    if (!formData.tournamentType) {
      return "Selecciona el tipo de torneo.";
    }

    if (!formData.format) {
      return "Selecciona el formato del torneo.";
    }

    if (![8, 16, 32, 64].includes(formData.teams)) {
      return `Selecciona una cantidad válida de ${formData.mode === "individual" ? "jugadores" : "equipos"}.`;
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

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
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

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

 if (userError || !user) {
  setLoading(false);

  setErrorMessage(
    "Tu sesión no está disponible. Inicia sesión nuevamente.",
  );

  setTimeout(() => {
    router.replace("/login");
  }, 1200);

  return;
}
    const slug = createSlug(formData.name);

const { data: createdTournament, error: insertError } = await supabase
  .from("tournaments")
  .insert({
    user_id: user.id,
    name: formData.name.trim(),
    organization: organizationName,
    game: selectedGameName,
    tournament_type: formData.tournamentType,
    format: formData.format,
    mode: formData.mode,
    teams: formData.teams,
    max_players: formData.teams,
    date: formData.date,
    time: formData.time,
    server: formData.server,
    stream: formData.stream.trim() || null,
    description: formData.description.trim() || null,
    rules: formData.rules.trim() || null,
    slug,
    status: formData.status,
    banner: null,
  })
  .select()
  .single();

if (insertError || !createdTournament) {
  setLoading(false);

  console.error(
    "Error al crear el torneo:",
    insertError || "Supabase no devolvió el torneo creado",
  );

  setErrorMessage(
    insertError
      ? `No se pudo crear el torneo: ${insertError.message}`
      : "El torneo se guardó, pero no se pudo obtener su identificador.",
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  return;
}

setLoading(false);
router.replace(`/tournaments/${createdTournament.id}/teams`);
}

return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-[#0b0b0d]">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/40 bg-red-600/10 shadow-[0_0_25px_rgba(220,38,38,0.15)]">
              <span className="text-xl font-black text-red-500">
                E
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-white">
                Esports
              </p>

              <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                Bracket Live
              </p>
            </div>
          </Link>

         <div className="flex items-center gap-2">
  <Link
    href="/dashboard"
    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
  >
    ← Volver al Dashboard
  </Link>

  <LogoutButton />
</div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#19191c] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-600/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Administración de torneos
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Crear nuevo{" "}
              <span className="text-red-500">torneo</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              Configura los datos principales de la competencia. Después
              podrás registrar participantes, generar el fixture y administrar
              los resultados.
            </p>
          </div>
        </section>

        {(errorMessage || successMessage) && (
          <div className="mt-6">
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

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <div className="border-b border-white/10 pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                  Información general
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  Identidad del torneo
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Define el nombre, la organización y el tipo de evento.
                </p>
              </div>

              <div className="mt-6 grid gap-5">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Nombre del torneo
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    disabled={loading}
                    maxLength={100}
                    placeholder="Ejemplo: Shadow Fiend SA Global Tournament"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="truncate text-xs text-neutral-600">
                      Enlace: /tournament/
                      {previewSlug || "nombre-del-torneo"}
                    </p>

                    <p className="shrink-0 text-xs text-neutral-700">
                      {formData.name.length}/100
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="organization"
                      className="mb-2 block text-sm font-semibold text-neutral-300"
                    >
                      Organización
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      id="organization"
                      value={formData.organization}
                      onChange={(event) =>
                        updateField("organization", event.target.value)
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
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
                  </div>

                  <div>
                    <label
                      htmlFor="tournamentType"
                      className="mb-2 block text-sm font-semibold text-neutral-300"
                    >
                      Tipo de torneo
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      id="tournamentType"
                      value={formData.tournamentType}
                      onChange={(event) =>
                        updateField(
                          "tournamentType",
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tournamentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.organization === "Otra" && (
                  <div>
                    <label
                      htmlFor="customOrganization"
                      className="mb-2 block text-sm font-semibold text-neutral-300"
                    >
                      Nombre de la organización
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <input
                      id="customOrganization"
                      type="text"
                      value={formData.customOrganization}
                      onChange={(event) =>
                        updateField(
                          "customOrganization",
                          event.target.value,
                        )
                      }
                      disabled={loading}
                      maxLength={80}
                      placeholder="Escribe el nombre de la organización"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Estado inicial
                  </label>

                  <select
                    id="status"
                    value={formData.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <div className="border-b border-white/10 pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                  Competencia
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  Juego y formato
                </h2>

<p className="mt-2 text-sm text-neutral-500">
  Selecciona el juego, el formato y la capacidad máxima del torneo.
  Podrás generar el fixture aunque no se complete el cupo.
</p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="game"
                  className="mb-3 block text-sm font-semibold text-neutral-300"
                >
                  Juego
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <select
                    id="game"
                    value={formData.game}
                    onChange={(event) =>
                      updateField("game", event.target.value)
                    }
                    disabled={loading}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 pr-12 text-sm font-semibold text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {games.map((game) => (
                      <option key={game.value} value={game.value}>
                        {game.title}
                      </option>
                    ))}
                  </select>

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg text-neutral-500"
                  >
                    ▾
                  </span>
                </div>

                {selectedGameDescription && formData.game !== "Otro" && (
                  <p className="mt-2 text-xs text-neutral-600">
                    {selectedGameDescription}
                  </p>
                )}

                {formData.game === "Otro" && (
                  <div className="mt-4">
                    <label
                      htmlFor="customGame"
                      className="mb-2 block text-sm font-semibold text-neutral-300"
                    >
                      Nombre del juego
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <input
                      id="customGame"
                      type="text"
                      value={formData.customGame ?? ""}
                      onChange={(event) =>
                        updateField("customGame", event.target.value)
                      }
                      disabled={loading}
                      maxLength={80}
                      placeholder="Ejemplo: Tekken 8"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-neutral-300">
                  Modalidad
                  <span className="ml-1 text-red-500">*</span>
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      value: "team" as const,
                      title: "Por equipos",
                      description: "Registra equipos con logo, país y capitán.",
                    },
                    {
                      value: "individual" as const,
                      title: "Individual (1 vs 1)",
                      description: "Registra jugadores con avatar y país.",
                    },
                  ].map((mode) => {
                    const selected = formData.mode === mode.value;

                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => updateField("mode", mode.value)}
                        disabled={loading}
                        className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? "border-red-500/50 bg-red-600/10"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-white">{mode.title}</p>
                            <p className="mt-2 text-xs leading-5 text-neutral-600">
                              {mode.description}
                            </p>
                          </div>

                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-red-500 bg-red-600 text-white"
                                : "border-neutral-700 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-neutral-300">
                  Formato
                  <span className="ml-1 text-red-500">*</span>
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      value: "Eliminación simple",
                      title: "Eliminación simple",
                      description:
                        "Una derrota elimina al equipo del torneo.",
                    },
                    {
                      value: "Eliminación doble",
                      title: "Eliminación doble",
                      description:
                        "Incluye llave superior y llave inferior.",
                    },
                  ].map((format) => {
                    const selected =
                      formData.format === format.value;

                    return (
                      <button
                        key={format.value}
                        type="button"
                        onClick={() =>
                          updateField("format", format.value)
                        }
                        disabled={loading}
                        className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? "border-red-500/50 bg-red-600/10"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-white">
                              {format.title}
                            </p>

                            <p className="mt-2 text-xs leading-5 text-neutral-600">
                              {format.description}
                            </p>
                          </div>

                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-red-500 bg-red-600 text-white"
                                : "border-neutral-700 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

<div className="mt-6">
  <p className="mb-3 text-sm font-semibold text-neutral-300">
    Capacidad máxima
    <span className="ml-1 text-red-500">*</span>
  </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[8, 16, 32, 64].map((amount) => {
                    const selected = formData.teams === amount;

                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => updateField("teams", amount)}
                        disabled={loading}
                        className={`rounded-xl border px-4 py-4 text-center transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? "border-red-500 bg-red-600 text-white shadow-[0_10px_25px_rgba(220,38,38,0.18)]"
                            : "border-white/10 bg-black/20 text-neutral-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <span className="block text-2xl font-black">
                          {amount}
                        </span>

                        <span
                          className={`mt-1 block text-xs ${
                            selected
                              ? "text-red-100"
                              : "text-neutral-600"
                          }`}
                        >
                        Capacidad máxima
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">ℹ️</div>

                    <div>
                      <p className="text-sm font-semibold text-blue-300">
                        Capacidad máxima del torneo
                      </p>

                      <p className="mt-1 text-sm leading-6 text-blue-200">
                        La capacidad máxima indica el número máximo de{" "}
                        {formData.mode === "individual"
                          ? "jugadores"
                          : "equipos"} que podrán registrarse.
                      </p>

                      <p className="mt-2 text-sm text-blue-300">
                        Podrás generar el fixture aunque no se complete la
                        capacidad máxima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <div className="border-b border-white/10 pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                  Programación
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  Fecha y conexión
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Configura cuándo comenzará y dónde se jugará.
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Fecha de inicio
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      updateField("date", event.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="time"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Hora de inicio
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(event) =>
                      updateField("time", event.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="server"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Servidor o región
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <select
                    id="server"
                    value={formData.server}
                    onChange={(event) =>
                      updateField("server", event.target.value)
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {servers.map((server) => (
                      <option key={server} value={server}>
                        {server}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="stream"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Stream oficial
                  </label>

                  <input
                    id="stream"
                    type="url"
                    value={formData.stream}
                    onChange={(event) =>
                      updateField("stream", event.target.value)
                    }
                    disabled={loading}
                    placeholder="https://youtube.com/..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <div className="border-b border-white/10 pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                  Información adicional
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  Descripción y reglas
                </h2>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Descripción
                  </label>

                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    disabled={loading}
                    rows={5}
                    maxLength={1000}
                    placeholder="Describe el objetivo, modalidad y características del torneo..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <p className="mt-2 text-right text-xs text-neutral-700">
                    {formData.description.length}/1000
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="rules"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Reglas generales
                  </label>

                  <textarea
                    id="rules"
                    value={formData.rules}
                    onChange={(event) =>
                      updateField("rules", event.target.value)
                    }
                    disabled={loading}
                    rows={8}
                    maxLength={5000}
                    placeholder="Escribe las reglas, restricciones, sanciones y condiciones de participación..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <p className="mt-2 text-right text-xs text-neutral-700">
                    {formData.rules.length}/5000
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <div className="border-b border-white/10 pb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                  Vista previa
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  Resumen del torneo
                </h2>
              </div>

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
                  <PreviewItem
                    label="Juego"
                    value={selectedGameName || "Por definir"}
                  />

                  <PreviewItem
                    label="Formato"
                    value={formData.format}
                  />

                  <PreviewItem
                    label="Modalidad"
                    value={formData.mode === "individual" ? "Individual (1 vs 1)" : "Por equipos"}
                  />

                  <PreviewItem
                    label="Capacidad máxima"
                    value={`${formData.teams} ${formData.mode === "individual" ? "jugadores" : "equipos"}`}
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

            <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5">
              <p className="text-sm font-bold text-amber-300">
                Antes de continuar
              </p>

              <p className="mt-2 text-xs leading-6 text-amber-500/60">
                Después de crear el torneo podrás registrar los participantes,
                agregar sus imágenes y generar el fixture.
              </p>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creando torneo...
                </>
              ) : (
                <>
                  <span className="text-xl leading-none">＋</span>
                  Crear torneo
                </>
              )}
            </button>

            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </Link>
          </aside>
        </form>
      </div>
    </main>
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