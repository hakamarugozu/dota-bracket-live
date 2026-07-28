"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Tournament } from "@/types/tournament";

type Props = {
  tournament: Tournament;
  onDelete: (id: string) => void;
};

type ShareStatus =
  | "idle"
  | "copied"
  | "error";

function statusColor(
  status: string | null | undefined,
) {
  switch (status) {
    case "Borrador":
      return "bg-gray-600";

    case "Inscripciones abiertas":
      return "bg-green-600";

    case "Próximamente":
      return "bg-yellow-500";

    case "En curso":
      return "bg-blue-600";

    case "Finalizado":
      return "bg-red-600";

    default:
      return "bg-gray-600";
  }
}

async function copyTextToClipboard(
  text: string,
) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea =
    document.createElement("textarea");

  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";

  document.body.appendChild(textArea);

  textArea.focus();
  textArea.select();

  const copied =
    document.execCommand("copy");

  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error(
      "El navegador no permitió copiar el enlace.",
    );
  }
}

export default function TournamentCard({
  tournament,
  onDelete,
}: Props) {
  const [shareStatus, setShareStatus] =
    useState<ShareStatus>("idle");

  const resetShareStatusTimer =
    useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (
        resetShareStatusTimer.current !== null
      ) {
        window.clearTimeout(
          resetShareStatusTimer.current,
        );
      }
    };
  }, []);

  function scheduleShareStatusReset() {
    if (
      resetShareStatusTimer.current !== null
    ) {
      window.clearTimeout(
        resetShareStatusTimer.current,
      );
    }

    resetShareStatusTimer.current =
      window.setTimeout(() => {
        setShareStatus("idle");
      }, 2500);
  }

  async function handleShare() {
    const fixtureUrl =
      `${window.location.origin}` +
      `/tournaments/${tournament.id}/bracket`;

    try {
      await copyTextToClipboard(fixtureUrl);

      setShareStatus("copied");
      scheduleShareStatusReset();
    } catch (error) {
      console.error(
        "No se pudo copiar el enlace del fixture:",
        error,
      );

      setShareStatus("error");
      scheduleShareStatusReset();
    }
  }

  const shareButtonText =
    shareStatus === "copied"
      ? "✓ Enlace copiado"
      : shareStatus === "error"
        ? "No se pudo copiar"
        : "Compartir";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111113] p-6 transition hover:border-red-500/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {tournament.name}
          </h2>

          <p className="mt-2 text-gray-500">
            {tournament.organization ||
              "Organización no especificada"}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold text-white ${statusColor(
            tournament.status,
          )}`}
        >
          {tournament.status ||
            "Sin estado"}
        </span>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Info
          label="Juego"
          value={tournament.game}
        />

        <Info
          label="Formato"
          value={tournament.format}
        />

        <Info
          label="Equipos"
          value={tournament.teams}
        />

        <Info
          label="Servidor"
          value={tournament.server}
        />

        <Info
          label="Fecha"
          value={tournament.date}
        />

        <Info
          label="Hora"
          value={tournament.time}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="rounded-xl bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-700"
        >
          Abrir Centro del Torneo
        </Link>

        <Link
          href={`/tournaments/${tournament.id}/edit`}
          className="rounded-xl bg-neutral-700 px-5 py-3 transition hover:bg-neutral-600"
        >
          Editar
        </Link>

        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          className={`rounded-xl px-5 py-3 transition ${
            shareStatus === "copied"
              ? "bg-emerald-700 hover:bg-emerald-600"
              : shareStatus === "error"
                ? "bg-red-800 hover:bg-red-700"
                : "bg-neutral-700 hover:bg-neutral-600"
          }`}
        >
          {shareButtonText}
        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(tournament.id)
          }
          className="rounded-xl bg-red-950 px-5 py-3 transition hover:bg-red-800"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

type InfoProps = {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
};

function Info({
  label,
  value,
}: InfoProps) {
  const displayedValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "Por definir"
      : value;

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-white">
        {displayedValue}
      </p>
    </div>
  );
}