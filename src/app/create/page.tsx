"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

const TEAM_OPTIONS = [8, 16, 32, 64];

const MAX_LOGO_FILE_SIZE =
  5 * 1024 * 1024;

const LOGO_SIZE = 160;
const LOGO_QUALITY = 0.72;

export default function CreateTournament() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [game, setGame] =
    useState("Dota 1");

  const [teamCount, setTeamCount] =
    useState(8);

  const [teams, setTeams] =
    useState<string[]>(
      Array.from(
        { length: 8 },
        () => ""
      )
    );

  const [teamLogos, setTeamLogos] =
    useState<(string | null)[]>(
      Array.from(
        { length: 8 },
        () => null
      )
    );

  const [processingLogoIndex, setProcessingLogoIndex] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const fileInputRefs =
    useRef<
      Array<HTMLInputElement | null>
    >([]);

  const handleTeamCountChange = (
    newTeamCount: number
  ) => {
    setTeamCount(newTeamCount);

    setTeams((currentTeams) =>
      Array.from(
        { length: newTeamCount },
        (_, index) =>
          currentTeams[index] || ""
      )
    );

    setTeamLogos((currentLogos) =>
      Array.from(
        { length: newTeamCount },
        (_, index) =>
          currentLogos[index] || null
      )
    );

    fileInputRefs.current =
      fileInputRefs.current.slice(
        0,
        newTeamCount
      );

    setError("");
  };

  const handleTeamChange = (
    index: number,
    value: string
  ) => {
    setTeams((currentTeams) =>
      currentTeams.map(
        (team, teamIndex) =>
          teamIndex === index
            ? value
            : team
      )
    );

    setError("");
  };

  const handleLogoChange = async (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "El logo debe ser una imagen PNG, JPG, WEBP u otro formato de imagen válido."
      );

      return;
    }

    if (
      file.size >
      MAX_LOGO_FILE_SIZE
    ) {
      setError(
        "El logo no puede pesar más de 5 MB."
      );

      return;
    }

    setProcessingLogoIndex(index);
    setError("");

    try {
      const optimizedLogo =
        await optimizeTeamLogo(file);

      setTeamLogos(
        (currentLogos) =>
          currentLogos.map(
            (logo, logoIndex) =>
              logoIndex === index
                ? optimizedLogo
                : logo
          )
      );
    } catch {
      setError(
        `No se pudo procesar el logo del Equipo ${
          index + 1
        }. Intenta con otra imagen.`
      );
    } finally {
      setProcessingLogoIndex(null);
    }
  };

  const handleRemoveLogo = (
    index: number
  ) => {
    setTeamLogos(
      (currentLogos) =>
        currentLogos.map(
          (logo, logoIndex) =>
            logoIndex === index
              ? null
              : logo
        )
    );

    setError("");
  };

  const handleCreateTournament =
    () => {
      const cleanName =
        name.trim();

      if (!cleanName) {
        setError(
          "Debes escribir el nombre del torneo."
        );

        return;
      }

      const cleanTeams =
        teams.map((team) =>
          team.trim()
        );

      const emptyTeamIndex =
        cleanTeams.findIndex(
          (team) =>
            team.length === 0
        );

      if (
        emptyTeamIndex !== -1
      ) {
        setError(
          `Debes escribir el nombre del Equipo ${
            emptyTeamIndex + 1
          }.`
        );

        return;
      }

      const normalizedTeams =
        cleanTeams.map((team) =>
          team.toLowerCase()
        );

      const hasRepeatedTeam =
        normalizedTeams.some(
          (team, index) =>
            normalizedTeams.indexOf(
              team
            ) !== index
        );

      if (hasRepeatedTeam) {
        setError(
          "No puedes registrar equipos con el mismo nombre."
        );

        return;
      }

      const tournamentTeams =
        cleanTeams.map(
          (teamName, index) => ({
            id: crypto.randomUUID(),
            name: teamName,
            logoUrl:
              teamLogos[index] ||
              null,
            seed: index + 1,
          })
        );

      const tournament = {
        id: crypto.randomUUID(),
        name: cleanName,
        game,
        teamCount,

        /*
          Conservamos esta lista para
          mantener compatibilidad con
          el sistema actual.
        */
        teams: cleanTeams,

        /*
          Esta nueva lista contiene
          nombre, logo, seed e id.
        */
        teamDetails:
          tournamentTeams,

        createdAt:
          new Date().toISOString(),
      };

      try {
        localStorage.setItem(
          "currentTournament",
          JSON.stringify(
            tournament
          )
        );

        localStorage.removeItem(
          "currentBracket"
        );

        router.push(
          "/tournament"
        );
      } catch {
        setError(
          "No se pudo guardar el torneo. Es posible que los logos ocupen demasiado espacio. Prueba usando imágenes más pequeñas o quitando algunos logos."
        );
      }
    };

  return (
    <main className="min-h-screen bg-[#02070d] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Volver al inicio
          </Link>

          <div className="hidden items-center gap-2 text-sm font-bold text-gray-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Dota Bracket Live
          </div>
        </div>

        <section className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-4xl shadow-[0_0_40px_rgba(220,38,38,0.15)]">
            🏆
          </div>

          <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">
            Crear Torneo
          </h1>

          <p className="mt-3 text-gray-400">
            Registra la información,
            los equipos y sus logos.
          </p>
        </section>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f15] shadow-2xl">
          <div className="border-b border-white/10 bg-black/20 px-6 py-5 sm:px-8">
            <h2 className="text-xl font-black">
              Información del torneo
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Configura el torneo antes
              de generar el fixture.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="tournament-name"
                  className="mb-2 block text-sm font-bold text-gray-200"
                >
                  Nombre del torneo
                </label>

                <input
                  id="tournament-name"
                  type="text"
                  placeholder="Ejemplo: Dota Bolivia Championship"
                  value={name}
                  onChange={(
                    event
                  ) => {
                    setName(
                      event.target.value
                    );

                    setError("");
                  }}
                  className="w-full rounded-lg border border-white/15 bg-black/40 p-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="game"
                  className="mb-2 block text-sm font-bold text-gray-200"
                >
                  Juego
                </label>

                <select
                  id="game"
                  value={game}
                  onChange={(
                    event
                  ) =>
                    setGame(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-white/15 bg-black/40 p-3.5 text-white outline-none transition focus:border-red-500"
                >
                  <option value="Dota 1">
                    Dota 1
                  </option>

                  <option value="Dota 2">
                    Dota 2
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="team-count"
                  className="mb-2 block text-sm font-bold text-gray-200"
                >
                  Cantidad de equipos
                </label>

                <select
                  id="team-count"
                  value={teamCount}
                  onChange={(
                    event
                  ) =>
                    handleTeamCountChange(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                  className="w-full rounded-lg border border-white/15 bg-black/40 p-3.5 text-white outline-none transition focus:border-red-500"
                >
                  {TEAM_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option} Equipos
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="my-8 h-px bg-white/10" />

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-black text-red-400">
                  Equipos participantes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Registra los{" "}
                  {teamCount} equipos y
                  añade sus logos si los
                  tienen.
                </p>
              </div>

              <div className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300">
                {teamCount} EQUIPOS
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.04] px-4 py-3 text-xs leading-relaxed text-yellow-200/70">
              Los logos son opcionales.
              Si un equipo no tiene
              logo, el fixture mostrará
              automáticamente sus
              iniciales y un color
              propio.
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {teams.map(
                (team, index) => {
                  const logo =
                    teamLogos[index];

                  const processing =
                    processingLogoIndex ===
                    index;

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <label
                        htmlFor={`team-${index}`}
                        className="mb-3 flex items-center justify-between text-sm font-bold"
                      >
                        <span>
                          Equipo{" "}
                          {index + 1}
                        </span>

                        <span className="text-xs text-gray-600">
                          #
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>
                      </label>

                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#05080c]">
                          {logo ? (
                            <img
                              src={logo}
                              alt={`Vista previa del logo del Equipo ${
                                index + 1
                              }`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-black text-gray-600">
                              {getTeamInitials(
                                team
                              )}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <input
                            id={`team-${index}`}
                            type="text"
                            placeholder={`Nombre del Equipo ${
                              index + 1
                            }`}
                            value={team}
                            onChange={(
                              event
                            ) =>
                              handleTeamChange(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-white/15 bg-[#05080c] p-3 text-white outline-none transition placeholder:text-gray-700 focus:border-red-500"
                          />

                          <input
                            ref={(
                              element
                            ) => {
                              fileInputRefs.current[
                                index
                              ] =
                                element;
                            }}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(
                              event
                            ) =>
                              handleLogoChange(
                                index,
                                event
                              )
                            }
                            className="hidden"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            fileInputRefs.current[
                              index
                            ]?.click()
                          }
                          className="flex-1 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[10px] font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
                        >
                          {processing
                            ? "PROCESANDO..."
                            : logo
                              ? "CAMBIAR LOGO"
                              : "SUBIR LOGO"}
                        </button>

                        {logo && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveLogo(
                                index
                              )
                            }
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[10px] font-black text-gray-400 transition hover:bg-white/[0.07] hover:text-white"
                          >
                            QUITAR
                          </button>
                        )}
                      </div>

                      <p className="mt-2 text-[9px] font-bold text-gray-600">
                        PNG, JPG o WEBP.
                        Máximo 5 MB.
                      </p>
                    </div>
                  );
                }
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={
                processingLogoIndex !==
                null
              }
              onClick={
                handleCreateTournament
              }
              className="mt-8 w-full rounded-lg bg-red-600 py-4 text-base font-black transition hover:bg-red-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-gray-800 disabled:text-gray-500"
            >
              {processingLogoIndex !==
              null
                ? "Procesando logo..."
                : "Crear torneo y generar fixture"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function getTeamInitials(
  teamName: string
) {
  const initials = teamName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "?";
}

function optimizeTeamLogo(
  file: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result !==
          "string"
        ) {
          reject(
            new Error(
              "No se pudo leer la imagen."
            )
          );

          return;
        }

        const image =
          new Image();

        image.onload = () => {
          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            LOGO_SIZE;

          canvas.height =
            LOGO_SIZE;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "No se pudo procesar la imagen."
              )
            );

            return;
          }

          context.clearRect(
            0,
            0,
            LOGO_SIZE,
            LOGO_SIZE
          );

          const sourceSize =
            Math.min(
              image.naturalWidth,
              image.naturalHeight
            );

          const sourceX =
            (image.naturalWidth -
              sourceSize) /
            2;

          const sourceY =
            (image.naturalHeight -
              sourceSize) /
            2;

          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            LOGO_SIZE,
            LOGO_SIZE
          );

          const optimizedLogo =
            canvas.toDataURL(
              "image/webp",
              LOGO_QUALITY
            );

          resolve(
            optimizedLogo
          );
        };

        image.onerror = () => {
          reject(
            new Error(
              "La imagen seleccionada no es válida."
            )
          );
        };

        image.src =
          reader.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "No se pudo leer el archivo."
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}