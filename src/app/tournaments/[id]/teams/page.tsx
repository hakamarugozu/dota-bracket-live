"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getTeams,
  type Team,
} from "@/lib/teams";
import { getBracket } from "@/lib/bracketStorage";

type Tournament = {
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
  status: string | null;
  banner: string | null;
  mode: "team" | "individual" | null;
};

type TeamForm = {
  name: string;
  country: string;
  captain: string;
};

const initialTeamForm: TeamForm = {
  name: "",
  country: "",
  captain: "",
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function normalizeOptionalValue(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTeamName(name: string) {
  return name.trim().toLowerCase();
}

function revokePreviewUrl(previewUrl: string) {
  if (previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

export default function TournamentTeamsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tournamentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState<TeamForm>(initialTeamForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [loadingPage, setLoadingPage] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [bracketStarted, setBracketStarted] = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [imageInputKey, setImageInputKey] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isTournamentOwner, setIsTournamentOwner] =
    useState(false);

  const [canManageBracket, setCanManageBracket] =
    useState(false);

  const teamLimit = tournament?.teams ?? 0;
  const registeredTeams = teams.length;
  const remainingTeams = Math.max(teamLimit - registeredTeams, 0);
  const tournamentIsFull =
    tournament !== null && registeredTeams >= tournament.teams;
  const canGenerateBracket = registeredTeams >= 2;
  const isIndividual = tournament?.mode === "individual";
  const participantSingular = isIndividual ? "jugador" : "equipo";
  const participantPlural = isIndividual ? "jugadores" : "equipos";
  const imageLabel = isIndividual ? "Avatar" : "Logo";

  const progress = useMemo(() => {
    if (!teamLimit) {
      return 0;
    }

    return Math.min((registeredTeams / teamLimit) * 100, 100);
  }, [registeredTeams, teamLimit]);

  const loadTournamentData = useCallback(async () => {
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
            teams,
            date,
            time,
            server,
            status,
            banner,
            mode
          `,
        )
        .eq("id", tournamentId)
        .maybeSingle();

      if (tournamentError) {
        throw new Error(
          tournamentError.message ||
            "No se pudo consultar el torneo solicitado.",
        );
      }

      if (!tournamentData) {
        throw new Error(
          "El torneo no existe o no tienes acceso autorizado.",
        );
      }

      const owner =
        tournamentData.user_id === user.id;

      let bracketPermission = owner;

      if (!owner) {
        const {
          data: permissionData,
          error: permissionError,
        } = await supabase
          .from(
            "tournament_permissions",
          )
          .select(
            "can_manage_bracket, can_manage_participants",
          )
          .eq(
            "tournament_id",
            tournamentId,
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (permissionError) {
          throw new Error(
            permissionError.message ||
              "No se pudieron comprobar tus permisos.",
          );
        }

        if (
          permissionData?.can_manage_participants !==
          true
        ) {
          throw new Error(
            "No tienes permiso para administrar los participantes de este torneo.",
          );
        }

        bracketPermission =
          permissionData.can_manage_bracket ===
          true;
      }

      const {
        data: synchronizedByes,
        error: synchronizeError,
      } = await supabase.rpc(
        "sync_tournament_participants_into_byes",
        {
          p_tournament_id:
            tournamentId,
        },
      );

      if (synchronizeError) {
        throw new Error(
          synchronizeError.message ||
            "No se pudieron sincronizar los participantes pendientes con los pases libres del fixture.",
        );
      }

      const [loadedTeams, loadedBracket] =
        await Promise.all([
          getTeams(tournamentId),
          getBracket(tournamentId),
        ]);

      const synchronizedCount =
        Number(synchronizedByes) || 0;

      if (synchronizedCount > 0) {
        setSuccessMessage(
          synchronizedCount === 1
            ? "Un participante pendiente ocupó automáticamente un pase libre del fixture sin reordenar la llave."
            : `${synchronizedCount} participantes pendientes ocuparon automáticamente pases libres del fixture sin reordenar la llave.`,
        );
      }

      setIsTournamentOwner(owner);
      setCanManageBracket(
        bracketPermission,
      );
      setTournament(
        tournamentData as Tournament,
      );
      setTeams(loadedTeams);
      setBracketStarted(
        Boolean(loadedBracket),
      );
    } catch (error) {
      console.error("Error al cargar los equipos:", error);

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
    void loadTournamentData();
  }, [loadTournamentData]);

  useEffect(() => {
    return () => {
      revokePreviewUrl(imagePreview);
    };
  }, [imagePreview]);

  function updateField(field: keyof TeamForm, value: string) {
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

  function resetParticipantForm() {
    revokePreviewUrl(imagePreview);

    setEditingTeamId(null);
    setFormData(initialTeamForm);
    setImageFile(null);
    setImagePreview("");
    setRemoveExistingImage(false);
    setImageInputKey((current) => current + 1);
  }

  function handleEditTeam(team: Team) {
    revokePreviewUrl(imagePreview);

    setEditingTeamId(team.id);
    setFormData({
      name: team.name,
      country: team.country ?? "",
      captain: team.captain ?? "",
    });
    setImageFile(null);
    setImagePreview(team.logo ?? "");
    setRemoveExistingImage(false);
    setImageInputKey((current) => current + 1);
    setErrorMessage("");
    setSuccessMessage("");

    window.setTimeout(() => {
      document
        .getElementById("participant-form-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  function validateTeamForm() {
    const teamName = formData.name.trim();

    if (!teamName) {
      return `Escribe el nombre del ${participantSingular}.`;
    }

    if (teamName.length < 2) {
      return `El nombre del ${participantSingular} debe tener al menos 2 caracteres.`;
    }

    if (teamName.length > 80) {
      return `El nombre del ${participantSingular} no puede superar los 80 caracteres.`;
    }

    const duplicatedTeam = teams.some(
      (team) =>
        team.id !== editingTeamId &&
        normalizeTeamName(team.name) === normalizeTeamName(teamName),
    );

    if (duplicatedTeam) {
      return `Ya existe un ${participantSingular} registrado con ese nombre.`;
    }

    if (!editingTeamId && tournamentIsFull) {
      return `El torneo ya alcanzó el límite de ${participantPlural}.`;
    }

    return "";
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Selecciona un archivo de imagen válido.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("La imagen no puede superar los 2 MB.");
      event.target.value = "";
      return;
    }

    revokePreviewUrl(imagePreview);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function clearSelectedImage() {
    revokePreviewUrl(imagePreview);

    setImageFile(null);
    setImagePreview("");
    setRemoveExistingImage(Boolean(editingTeamId));
    setImageInputKey((current) => current + 1);
  }

  async function uploadParticipantImage() {
    if (!imageFile || !tournament) {
      return null;
    }

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "png";
    const filePath = `${tournament.id}/${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("team-logos").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tournament || savingTeam) {
      return;
    }

    const editingTeam = editingTeamId
      ? teams.find((team) => team.id === editingTeamId) ?? null
      : null;

    if (!editingTeam && tournamentIsFull) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateTeamForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSavingTeam(true);

    try {
      const uploadedImageUrl = await uploadParticipantImage();

      if (editingTeam) {
        const newName =
          formData.name.trim();

        const newCountry =
          normalizeOptionalValue(
            formData.country,
          );

        const newCaptain =
          isIndividual
            ? null
            : normalizeOptionalValue(
                formData.captain,
              );

        const updateLogo =
          Boolean(uploadedImageUrl) ||
          removeExistingImage;

        const newLogo =
          uploadedImageUrl
            ? uploadedImageUrl
            : removeExistingImage
              ? null
              : editingTeam.logo ??
                null;

        const {
          data: updated,
          error: updateError,
        } = await supabase.rpc(
          "update_tournament_participant",
          {
            p_tournament_id:
              tournament.id,

            p_team_id:
              editingTeam.id,

            p_name:
              newName,

            p_country:
              newCountry,

            p_captain:
              newCaptain,

            p_logo:
              newLogo,

            p_update_logo:
              updateLogo,
          },
        );

        if (
          updateError ||
          updated !== true
        ) {
          throw new Error(
            updateError?.message ||
              `No se pudo actualizar el ${participantSingular}.`,
          );
        }

        const updatedTeam: Team = {
          ...editingTeam,
          name: newName,
          logo: newLogo,
          country: newCountry,
          captain: newCaptain,
        };

        setTeams((current) =>
          current.map((team) =>
            team.id === editingTeam.id ? updatedTeam : team,
          ),
        );

        resetParticipantForm();

        setSuccessMessage(
          `El ${participantSingular} "${newName}" fue actualizado sin modificar resultados, avances ni posiciones del fixture.`,
        );

        return;
      }

      const newName =
        formData.name.trim();

      const {
        data: created,
        error: createError,
      } = await supabase.rpc(
        "create_tournament_participant",
        {
          p_tournament_id:
            tournament.id,

          p_name:
            newName,

          p_logo:
            uploadedImageUrl,

          p_country:
            normalizeOptionalValue(
              formData.country,
            ),

          p_captain:
            isIndividual
              ? null
              : normalizeOptionalValue(
                  formData.captain,
                ),
        },
      );

      if (
        createError ||
        created !== true
      ) {
        throw new Error(
          createError?.message ||
            `No se pudo registrar el ${participantSingular}.`,
        );
      }

      const {
        data: synchronizedByes,
        error: synchronizeError,
      } = await supabase.rpc(
        "sync_tournament_participants_into_byes",
        {
          p_tournament_id:
            tournament.id,
        },
      );

      const synchronizedCount =
        Number(synchronizedByes) || 0;

      const loadedTeams =
        await getTeams(
          tournament.id,
        );

      setTeams(loadedTeams);
      resetParticipantForm();

      if (synchronizeError) {
        setErrorMessage(
          `El ${participantSingular} fue registrado, pero no se pudo comprobar el pase libre del fixture: ${synchronizeError.message}`,
        );
      }

      setSuccessMessage(
        synchronizedCount > 0
          ? `El ${participantSingular} "${newName}" fue registrado y ocupó un pase libre del fixture sin reordenar la llave.`
          : bracketStarted
            ? `El ${participantSingular} "${newName}" fue registrado en la lista oficial. El fixture no tenía un pase libre seguro disponible, por lo que sus cruces actuales no fueron modificados.`
            : `El ${participantSingular} "${newName}" fue registrado.`,
      );
    } catch (error) {
      console.error(`Error al guardar el ${participantSingular}:`, error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : `No se pudo guardar el ${participantSingular}.`,
      );
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleDeleteTeam(
    team: Team,
  ) {
    if (deletingTeamId) {
      return;
    }

    if (
      bracketStarted &&
      !isTournamentOwner
    ) {
      setErrorMessage(
        `El fixture ya fue generado. Solo el propietario puede eliminar al ${participantSingular} de la lista oficial.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        bracketStarted
          ? `¿Seguro que deseas eliminar al ${participantSingular} "${team.name}"? Si ocupó un pase libre y todavía no jugó, se retirará también del fixture y se restaurará el BYE sin reordenar la llave.`
          : `¿Seguro que deseas eliminar al ${participantSingular} "${team.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingTeamId(team.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: deleted,
        error: deleteError,
      } = await supabase.rpc(
        "delete_tournament_participant",
        {
          p_tournament_id:
            tournament?.id ??
            tournamentId,

          p_team_id:
            team.id,
        },
      );

      if (
        deleteError ||
        deleted !== true
      ) {
        throw new Error(
          deleteError?.message ||
            `No se pudo eliminar el ${participantSingular}.`,
        );
      }

      setTeams((current) =>
        current.filter(
          (currentTeam) =>
            currentTeam.id !==
            team.id,
        ),
      );

      if (
        editingTeamId === team.id
      ) {
        resetParticipantForm();
      }

      setSuccessMessage(
        bracketStarted
          ? `El ${participantSingular} "${team.name}" fue eliminado. Si ocupaba un pase libre sin jugar, el BYE fue restaurado sin reordenar el fixture.`
          : `El ${participantSingular} "${team.name}" fue eliminado.`,
      );
    } catch (error) {
      console.error(
        `Error al eliminar el ${participantSingular}:`,
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : `No se pudo eliminar el ${participantSingular}.`,
      );
    } finally {
      setDeletingTeamId(null);
    }
  }

  if (loadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-semibold text-neutral-400">
            Cargando participantes del torneo...
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
              "El torneo solicitado no existe o no tienes permiso para administrarlo."}
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
              <span className="text-xl font-black text-red-500">E</span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-white">
                Esports Bracket
              </p>

              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.28em] text-red-500">
                Live
              </p>
            </div>
          </Link>

          <Link
            href={
              isTournamentOwner
                ? `/tournaments/${tournament.id}`
                : "/dashboard/assigned-tournaments"
            }
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            {isTournamentOwner
              ? "← Centro del Torneo"
              : "← Torneos asignados"}
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#19191c] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-600/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />

                <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                  Administración de participantes
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {isIndividual ? "Jugadores" : "Equipos"} del{" "}
                <span className="text-red-500">torneo</span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400 sm:text-base">
                {bracketStarted ? (
                  <>
                    Edita los datos de los {participantPlural} de{" "}
                    <strong className="text-neutral-200">{tournament.name}</strong>{" "}
                    sin modificar resultados, avances ni posiciones del fixture.
                  </>
                ) : (
                  <>
                    Registra los {participantPlural} que participarán en{" "}
                    <strong className="text-neutral-200">{tournament.name}</strong>.
                    Puedes generar el fixture desde 2 participantes, sin necesidad de completar todos los cupos.
                  </>
                )}
              </p>
            </div>

            <div className="w-full rounded-2xl border border-white/10 bg-black/25 p-5 lg:max-w-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                    {isIndividual ? "Jugadores registrados" : "Equipos registrados"}
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {registeredTeams}
                    <span className="text-lg text-neutral-600">
                      {" "}
                      / {teamLimit}
                    </span>
                  </p>
                </div>

                <p
                  className={`text-sm font-bold ${
                    tournamentIsFull ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {tournamentIsFull
                    ? "Cupos completos"
                    : `${remainingTeams} disponibles`}
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-red-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <section
            id="participant-form-section"
            className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6"
          >
            <div className="border-b border-white/10 pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                {editingTeamId ? "Editar participante" : "Nuevo participante"}
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                {editingTeamId
                  ? `Editar ${participantSingular}`
                  : `Registrar ${participantSingular}`}
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {editingTeamId
                  ? `Puedes cambiar el nombre, ${imageLabel.toLowerCase()}, país${
                      isIndividual ? "" : " y capitán"
                    } sin reconstruir el fixture.`
                  : `El nombre es obligatorio. La imagen y el país son opcionales.${
                      isIndividual ? "" : " El capitán también es opcional."
                    }`}
              </p>
            </div>

            {bracketStarted && !editingTeamId && (
              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
                <p className="font-bold text-amber-300">
                  Fixture en curso
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-500/70">
                  {isTournamentOwner
                    ? "Puedes registrar, editar o eliminar participantes de la lista oficial. Cuando exista un pase libre seguro, el nuevo participante lo ocupará automáticamente sin reordenar la llave."
                    : "Puedes registrar nuevos participantes y editar sus datos. Mientras exista el fixture, solo el propietario puede eliminar. Cuando exista un pase libre seguro, el nuevo participante lo ocupará automáticamente sin reordenar la llave."}
                </p>
              </div>
            )}

            {tournamentIsFull && !editingTeamId ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
                <p className="font-bold text-emerald-300">
                  Todos los cupos están completos
                </p>

                <p className="mt-2 text-sm leading-6 text-emerald-500/70">
                  El torneo alcanzó su capacidad máxima de {teamLimit} {participantPlural}.
                  Ya no se pueden registrar más participantes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="teamName"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Nombre del {participantSingular}
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="teamName"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    disabled={savingTeam}
                    maxLength={80}
                    placeholder={isIndividual ? "Ejemplo: Yiyo" : "Ejemplo: W3Arena Legends"}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="participantImage"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    {imageLabel}
                  </label>

                  <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#17171a]">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt={`Vista previa del ${imageLabel.toLowerCase()}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-black uppercase tracking-[0.12em] text-neutral-600">
                            {isIndividual ? "Avatar" : "Logo"}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <input
                          key={imageInputKey}
                          id="participantImage"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleImageChange}
                          disabled={savingTeam}
                          className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        <p className="mt-2 text-xs leading-5 text-neutral-600">
                          PNG, JPG, WEBP o GIF. Máximo 2 MB.
                        </p>

                        {(imageFile || imagePreview) && (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="truncate text-xs font-semibold text-neutral-400">
                              {imageFile
                                ? imageFile.name
                                : `Imagen actual del ${participantSingular}`}
                            </p>

                            <button
                              type="button"
                              onClick={clearSelectedImage}
                              disabled={savingTeam}
                              className="shrink-0 text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              Quitar imagen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="teamCountry"
                      className="mb-2 block text-sm font-semibold text-neutral-300"
                    >
                      País
                    </label>

                    <input
                      id="teamCountry"
                      type="text"
                      value={formData.country}
                      onChange={(event) =>
                        updateField("country", event.target.value)
                      }
                      disabled={savingTeam}
                      maxLength={60}
                      placeholder="Bolivia"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {!isIndividual && (
                  <div>
                    <label
                      htmlFor="teamCaptain"
                      className="mb-2 block text-sm font-semibold text-neutral-300"
                    >
                      Capitán
                    </label>

                    <input
                      id="teamCaptain"
                      type="text"
                      value={formData.captain}
                      onChange={(event) =>
                        updateField("captain", event.target.value)
                      }
                      disabled={savingTeam}
                      maxLength={80}
                      placeholder="Nickname del capitán"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/60 focus:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    savingTeam ||
                    (!editingTeamId && tournamentIsFull)
                  }
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {savingTeam ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {editingTeamId
                        ? "Guardando cambios..."
                        : "Registrando..."}
                    </>
                  ) : editingTeamId ? (
                    <>
                      <span className="text-lg leading-none">✓</span>
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <span className="text-xl leading-none">＋</span>
                      Registrar {participantSingular}
                    </>
                  )}
                </button>

                {editingTeamId && (
                  <button
                    type="button"
                    onClick={resetParticipantForm}
                    disabled={savingTeam}
                    className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-bold text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar edición
                  </button>
                )}
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                  Participantes
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  {isIndividual ? "Jugadores registrados" : "Equipos registrados"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Lista oficial de participantes del torneo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetParticipantForm();
                  void loadTournamentData();
                }}
                disabled={loadingPage}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-2xl text-neutral-600">
                  ⚔
                </div>

                <h3 className="mt-5 text-lg font-bold text-neutral-300">
                  Todavía no hay {participantPlural}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
                  Utiliza el formulario para registrar al primer participante
                  del torneo.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {teams.map((team, index) => (
                  <article
                    key={team.id}
                    className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/[0.025]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#17171a]">
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={`${isIndividual ? "Avatar" : "Logo"} de ${team.name}`}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-sm font-black text-red-400">
                            {getInitials(team.name) || (isIndividual ? "JG" : "EQ")}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600">
                              {isIndividual ? "Jugador" : "Equipo"} {index + 1}
                            </p>

                            <h3 className="mt-1 truncate text-base font-black text-white">
                              {team.name}
                            </h3>
                          </div>

                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => void handleDeleteTeam(team)}
                              disabled={
                                deletingTeamId !== null ||
                                (
                                  bracketStarted &&
                                  !isTournamentOwner
                                )
                              }
                              className="rounded-lg border border-red-500/20 bg-red-600/5 px-3 py-2 text-xs font-bold text-red-400 transition hover:border-red-500/40 hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingTeamId === team.id
                                ? "Eliminando..."
                                : "Eliminar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditTeam(team)}
                              disabled={savingTeam}
                              className="rounded-lg border border-blue-500/25 bg-blue-500/[0.07] px-3 py-2 text-xs font-bold text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-500/15 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Editar
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          <p className="text-neutral-500">
                            País:{" "}
                            <span className="font-semibold text-neutral-300">
                              {team.country || "No especificado"}
                            </span>
                          </p>

                          {!isIndividual && (
                            <p className="text-neutral-500">
                              Capitán:{" "}
                              <span className="font-semibold text-neutral-300">
                                {team.captain || "No especificado"}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {bracketStarted ? (
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-black text-white">
                Torneo en curso
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Los cambios se guardan automáticamente. Los nombres y los pases libres se sincronizan de forma segura sin reordenar cruces ni borrar resultados.
              </p>
            </div>

            {canManageBracket ? (
              <Link
                href={`/tournaments/${tournament.id}/bracket`}
                className="flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-emerald-500"
              >
                Ver fixture actualizado →
              </Link>
            ) : (
              <Link
                href="/dashboard/assigned-tournaments"
                className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-neutral-400 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                Torneos asignados →
              </Link>
            )}
          </section>
        ) : (
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#101012] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-black text-white">
                Siguiente paso: generar el fixture
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {canGenerateBracket
                  ? canManageBracket
                    ? `Ya puedes generar el fixture con ${registeredTeams} ${
                        registeredTeams === 1
                          ? participantSingular
                          : participantPlural
                      }.`
                    : `Los participantes ya están preparados. El organizador o un colaborador con permiso de Fixture debe generar la llave.`
                  : `Registra al menos 2 ${participantPlural} para preparar la generación del fixture.`}
              </p>
            </div>

            {canGenerateBracket &&
            canManageBracket ? (
              <Link
                href={`/tournaments/${tournament.id}/bracket`}
                className="flex shrink-0 items-center justify-center rounded-xl bg-red-600 px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-red-500"
              >
                Generar fixture →
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-neutral-600"
              >
                {canGenerateBracket
                  ? "Sin permiso de Fixture"
                  : "Mínimo 2 participantes"}
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}