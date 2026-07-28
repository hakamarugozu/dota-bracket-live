"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type TournamentOption = {
  id: string;
  name: string;
  game: string;
  mode: "team" | "individual" | null;
  status: string | null;
};

type TournamentPermission = {
  permission_id: string;
  tournament_id: string;
  collaborator_user_id: string;
  collaborator_email: string;
  collaborator_username: string;
  can_manage_bracket: boolean;
  can_manage_participants: boolean;
  created_at: string;
  updated_at: string;
};

function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStatusClasses(
  status: string | null,
) {
  const normalized =
    normalizeText(status);

  if (normalized.includes("finalizado")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized.includes("curso")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    normalized.includes("inscripciones")
  ) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  }

  return "border-white/10 bg-white/[0.04] text-neutral-400";
}

function formatDate(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
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

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

export default function PermissionsPage() {
  const [tournaments, setTournaments] =
    useState<TournamentOption[]>([]);

  const [
    selectedTournamentId,
    setSelectedTournamentId,
  ] = useState("");

  const [permissions, setPermissions] =
    useState<TournamentPermission[]>([]);

  const [identifier, setIdentifier] =
    useState("");

  const [
    canManageBracket,
    setCanManageBracket,
  ] = useState(true);

  const [
    canManageParticipants,
    setCanManageParticipants,
  ] = useState(false);

  const [
    editingPermissionId,
    setEditingPermissionId,
  ] = useState<string | null>(null);

  const [loadingPage, setLoadingPage] =
    useState(true);

  const [
    loadingPermissions,
    setLoadingPermissions,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    deletingPermissionId,
    setDeletingPermissionId,
  ] = useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedTournament =
    tournaments.find(
      (tournament) =>
        tournament.id ===
        selectedTournamentId,
    ) ?? null;

  const loadPermissions =
    useCallback(
      async (
        tournamentId: string,
      ) => {
        if (!tournamentId) {
          setPermissions([]);
          return;
        }

        setLoadingPermissions(true);
        setErrorMessage("");

        try {
          const {
            data,
            error,
          } = await supabase.rpc(
            "list_tournament_permissions",
            {
              p_tournament_id:
                tournamentId,
            },
          );

          if (error) {
            throw error;
          }

          setPermissions(
            (data ?? []) as TournamentPermission[],
          );
        } catch (error) {
          setPermissions([]);

          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar los colaboradores.",
            ),
          );
        } finally {
          setLoadingPermissions(false);
        }
      },
      [],
    );

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoadingPage(true);
      setErrorMessage("");

      try {
        const {
          data: {
            user,
          },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            userError?.message ||
              "No se pudo verificar la sesión.",
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from("tournaments")
          .select(
            `
              id,
              name,
              game,
              mode,
              status
            `,
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        const loadedTournaments =
          (data ?? []) as TournamentOption[];

        setTournaments(
          loadedTournaments,
        );

        const firstTournamentId =
          loadedTournaments[0]?.id ?? "";

        setSelectedTournamentId(
          firstTournamentId,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setTournaments([]);
        setSelectedTournamentId("");

        setErrorMessage(
          getErrorMessage(
            error,
            "No se pudieron cargar tus torneos.",
          ),
        );
      } finally {
        if (!cancelled) {
          setLoadingPage(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) {
      setPermissions([]);
      return;
    }

    void loadPermissions(
      selectedTournamentId,
    );
  }, [
    loadPermissions,
    selectedTournamentId,
  ]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setMessage("");
        },
        3200,
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  function resetForm() {
    setIdentifier("");
    setCanManageBracket(true);
    setCanManageParticipants(false);
    setEditingPermissionId(null);
  }

  function handleTournamentChange(
    tournamentId: string,
  ) {
    setSelectedTournamentId(
      tournamentId,
    );

    resetForm();
    setMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedTournamentId ||
      saving
    ) {
      return;
    }

    const normalizedIdentifier =
      identifier.trim();

    if (!normalizedIdentifier) {
      setErrorMessage(
        "Escribe el nombre de usuario o correo electrónico.",
      );
      return;
    }

    if (
      !canManageBracket &&
      !canManageParticipants
    ) {
      setErrorMessage(
        "Selecciona al menos un permiso.",
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const {
        error,
      } = await supabase.rpc(
        "save_tournament_permission",
        {
          p_tournament_id:
            selectedTournamentId,

          p_user_identifier:
            normalizedIdentifier,

          p_can_manage_bracket:
            canManageBracket,

          p_can_manage_participants:
            canManageParticipants,
        },
      );

      if (error) {
        throw error;
      }

      setMessage(
        editingPermissionId
          ? "Permisos actualizados correctamente."
          : "Colaborador agregado correctamente.",
      );

      resetForm();

      await loadPermissions(
        selectedTournamentId,
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudieron guardar los permisos.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(
    permission: TournamentPermission,
  ) {
    setEditingPermissionId(
      permission.permission_id,
    );

    setIdentifier(
      permission.collaborator_username ||
        permission.collaborator_email,
    );

    setCanManageBracket(
      permission.can_manage_bracket,
    );

    setCanManageParticipants(
      permission.can_manage_participants,
    );

    setMessage("");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(
    permission: TournamentPermission,
  ) {
    if (deletingPermissionId) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Seguro que quieres retirar todos los permisos de ${permission.collaborator_username || permission.collaborator_email}?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingPermissionId(
      permission.permission_id,
    );

    setMessage("");
    setErrorMessage("");

    try {
      const {
        error,
      } = await supabase.rpc(
        "delete_tournament_permission",
        {
          p_permission_id:
            permission.permission_id,
        },
      );

      if (error) {
        throw error;
      }

      if (
        editingPermissionId ===
        permission.permission_id
      ) {
        resetForm();
      }

      setMessage(
        "Acceso retirado correctamente.",
      );

      await loadPermissions(
        selectedTournamentId,
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo retirar el acceso.",
        ),
      );
    } finally {
      setDeletingPermissionId(null);
    }
  }

  if (loadingPage) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-neutral-500">
            Cargando permisos
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
                🔐
              </span>

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Control de acceso
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-black text-white sm:text-4xl">
              Gestionar permisos
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              Autoriza a otros usuarios registrados mediante su nombre de usuario o correo para administrar el fixture o los participantes.
            </p>
          </div>

          <Link
            href="/tournaments"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-red-500/30 hover:bg-red-600/10 hover:text-red-300"
          >
            Ver mis torneos
            <span>→</span>
          </Link>
        </div>
      </section>

      {message && (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-4 text-sm font-semibold text-emerald-300">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-sm font-semibold text-red-300">
          {errorMessage}
        </div>
      )}

      {tournaments.length === 0 ? (
        <section className="mt-6 flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-[#101012] px-6 text-center">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl">
              ◆
            </div>

            <h3 className="mt-5 text-xl font-black text-white">
              Todavía no tienes torneos
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Primero crea un torneo para poder asignar permisos a otros usuarios.
            </p>

            <Link
              href="/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500"
            >
              ＋ Crear torneo
            </Link>
          </div>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                Torneo
              </p>

              <label
                htmlFor="permission-tournament"
                className="mt-4 block text-sm font-bold text-white"
              >
                Selecciona el torneo
              </label>

              <select
                id="permission-tournament"
                value={selectedTournamentId}
                onChange={(event) => {
                  handleTournamentChange(
                    event.target.value,
                  );
                }}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090b] px-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:border-red-500/50"
              >
                {tournaments.map(
                  (tournament) => (
                    <option
                      key={tournament.id}
                      value={tournament.id}
                    >
                      {tournament.name}
                    </option>
                  ),
                )}
              </select>

              {selectedTournament && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">
                        {selectedTournament.name}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {selectedTournament.game} ·{" "}
                        {selectedTournament.mode ===
                        "individual"
                          ? "Individual"
                          : "Por equipos"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClasses(
                        selectedTournament.status,
                      )}`}
                    >
                      {selectedTournament.status ||
                        "Sin estado"}
                    </span>
                  </div>
                </div>
              )}
            </section>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                    {editingPermissionId
                      ? "Editar acceso"
                      : "Nuevo colaborador"}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-white">
                    {editingPermissionId
                      ? "Actualizar permisos"
                      : "Agregar usuario"}
                  </h3>
                </div>

                {editingPermissionId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-neutral-400 transition hover:border-white/20 hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <label
                htmlFor="collaborator-identifier"
                className="mt-6 block text-sm font-bold text-white"
              >
                Nombre de usuario o correo
              </label>

              <input
                id="collaborator-identifier"
                type="text"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(
                    event.target.value,
                  );

                  if (errorMessage) {
                    setErrorMessage("");
                  }
                }}
                placeholder="Ejemplo: yiyo o usuario@correo.com"
                autoComplete="off"
                disabled={Boolean(
                  editingPermissionId,
                )}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090b] px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-neutral-700 focus:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <p className="mt-2 text-xs leading-5 text-neutral-600">
                Puedes buscar al staff por su username único o por el correo de su cuenta registrada.
              </p>

              <div className="mt-6 space-y-3">
                <PermissionOption
                  checked={
                    canManageBracket
                  }
                  onChange={
                    setCanManageBracket
                  }
                  icon="🏆"
                  title="Administrar fixture"
                  description="Registrar ganadores, corregir resultados y mover el progreso del torneo."
                />

                <PermissionOption
                  checked={
                    canManageParticipants
                  }
                  onChange={
                    setCanManageParticipants
                  }
                  icon="👥"
                  title="Administrar equipos o jugadores"
                  description="Agregar, editar o eliminar participantes y sus imágenes."
                />
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  !selectedTournamentId
                }
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "GUARDANDO..."
                  : editingPermissionId
                    ? "ACTUALIZAR PERMISOS"
                    : "AGREGAR COLABORADOR"}
              </button>
            </form>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
              <p className="text-sm font-black text-amber-300">
                Control del propietario
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-200/60">
                El propietario conserva el control total. Los colaboradores no podrán eliminar ni finalizar el torneo con estos permisos.
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101012]">
            <header className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h3 className="text-xl font-black text-white">
                  Usuarios con acceso
                </h3>

                <p className="mt-1 text-sm text-neutral-500">
                  Permisos asignados al torneo seleccionado.
                </p>
              </div>

              <span className="w-fit rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-black text-neutral-400">
                {permissions.length}{" "}
                {permissions.length === 1
                  ? "colaborador"
                  : "colaboradores"}
              </span>
            </header>

            {loadingPermissions ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

                  <p className="mt-4 text-sm font-bold text-neutral-500">
                    Cargando colaboradores...
                  </p>
                </div>
              </div>
            ) : permissions.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-3xl">
                    🔐
                  </div>

                  <h4 className="mt-5 text-xl font-black text-white">
                    Sin colaboradores
                  </h4>

                  <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                    Solo tú puedes administrar este torneo. Agrega a un miembro del staff mediante su nombre de usuario o correo electrónico.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {permissions.map(
                  (permission) => (
                    <article
                      key={
                        permission.permission_id
                      }
                      className="px-5 py-5 sm:px-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-600/10 text-sm font-black text-red-300">
                              {(permission.collaborator_username ||
                                permission.collaborator_email)
                                .charAt(0)
                                .toUpperCase() ||
                                "U"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white sm:text-base">
                                {permission.collaborator_username ||
                                  "Usuario"}
                              </p>

                              <p className="mt-1 truncate text-xs text-neutral-500">
                                {permission.collaborator_email}
                              </p>

                              <p className="mt-1 text-xs text-neutral-600">
                                Acceso desde{" "}
                                {formatDate(
                                  permission.created_at,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <PermissionBadge
                              enabled={
                                permission.can_manage_bracket
                              }
                              label="Fixture"
                            />

                            <PermissionBadge
                              enabled={
                                permission.can_manage_participants
                              }
                              label="Participantes"
                            />
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              handleEdit(
                                permission,
                              );
                            }}
                            className="rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-4 py-2.5 text-xs font-black text-blue-300 transition hover:border-blue-500/40 hover:bg-blue-500/15"
                          >
                            EDITAR
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(
                                permission,
                              );
                            }}
                            disabled={
                              deletingPermissionId ===
                              permission.permission_id
                            }
                            className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-xs font-black text-red-300 transition hover:border-red-500/40 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingPermissionId ===
                            permission.permission_id
                              ? "RETIRANDO..."
                              : "RETIRAR"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PermissionOption({
  checked,
  onChange,
  icon,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(
            event.target.checked,
          );
        }}
        className="mt-1 h-4 w-4 accent-red-600"
      />

      <span className="text-xl">
        {icon}
      </span>

      <span>
        <span className="block text-sm font-black text-white">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-neutral-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function PermissionBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
        enabled
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/[0.03] text-neutral-600"
      }`}
    >
      {enabled ? "✓" : "—"}{" "}
      {label}
    </span>
  );
}