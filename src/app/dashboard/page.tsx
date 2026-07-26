"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type DashboardAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
  primary?: boolean;
};

const dashboardActions: DashboardAction[] = [
  {
    title: "Crear nuevo torneo",
    description:
      "Configura participantes, reglas, formato y genera el fixture.",
    href: "/create",
    icon: "＋",
    primary: true,
  },
  {
    title: "Administrar torneos",
    description:
      "Consulta tus competencias, resultados y enfrentamientos.",
   href: "/tournaments",
    icon: "◆",
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(authenticatedUser);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const fullName =
    typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "Administrador";

  const firstName = fullName.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#101012] to-[#09090a] px-6 py-8 shadow-2xl sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-red-900/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-600/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
                Centro de operaciones
              </span>
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Bienvenido,{" "}
              <span className="text-red-500">{firstName}</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              Organiza torneos, administra participantes y controla cada fase
              de la competencia desde un solo lugar.
            </p>
          </div>

          <Link
            href="/create"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(220,38,38,0.2)] transition hover:-translate-y-0.5 hover:bg-red-500 xl:w-auto"
          >
            <span className="text-xl leading-none">＋</span>
            Crear torneo
            <span className="transition group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Torneos activos
              </p>

              <p className="mt-3 text-3xl font-black text-white">0</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/10 text-xl text-red-400">
              ◆
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Aún no existen torneos activos.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Participantes
              </p>

              <p className="mt-3 text-3xl font-black text-white">0</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl text-neutral-300">
              ♟
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Equipos registrados en tus eventos.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Partidas
              </p>

              <p className="mt-3 text-3xl font-black text-white">0</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl text-neutral-300">
              ⚔
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Enfrentamientos creados hasta ahora.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#101012] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Próxima partida
              </p>

              <p className="mt-3 text-xl font-black text-white">Sin definir</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-xl text-neutral-300">
              ◷
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Aparecerá cuando programes un encuentro.
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Acciones rápidas</h3>

              <p className="mt-1 text-sm text-neutral-500">
                Continúa administrando tu plataforma.
              </p>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-neutral-500">
              Panel principal
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {dashboardActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={`group rounded-2xl border p-5 transition hover:-translate-y-1 ${
                  action.primary
                    ? "border-red-500/30 bg-gradient-to-br from-red-600/15 to-red-950/10 hover:border-red-500/60"
                    : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                    action.primary
                      ? "bg-red-600 text-white shadow-[0_10px_25px_rgba(220,38,38,0.2)]"
                      : "bg-white/[0.06] text-neutral-300"
                  }`}
                >
                  {action.icon}
                </div>

                <h4 className="mt-5 text-lg font-bold text-white">
                  {action.title}
                </h4>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {action.description}
                </p>

                <div
                  className={`mt-5 flex items-center gap-2 text-sm font-bold ${
                    action.primary ? "text-red-400" : "text-neutral-400"
                  }`}
                >
                  Abrir sección
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#101012] p-5 sm:p-6">
          <div className="border-b border-white/10 pb-5">
            <h3 className="text-xl font-bold text-white">Tu cuenta</h3>

            <p className="mt-1 text-sm text-neutral-500">
              Información de la sesión actual.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">
                Nombre
              </p>

              <p className="mt-2 break-words text-sm font-semibold text-white">
                {fullName}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">
                Correo electrónico
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-white">
                {user?.email ?? "Cargando información..."}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />

                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    Sesión activa
                  </p>

                  <p className="mt-1 text-xs text-emerald-500/60">
                    Tu cuenta está conectada correctamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#101012]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-xl font-bold text-white">Actividad reciente</h3>

            <p className="mt-1 text-sm text-neutral-500">
              Tus últimas acciones aparecerán en esta sección.
            </p>
          </div>

          <span className="w-fit rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-500">
            Sin actividad
          </span>
        </div>

        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl text-neutral-600">
            ◇
          </div>

          <h4 className="mt-5 text-lg font-bold text-neutral-300">
            Todavía no hay actividad
          </h4>

          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
            Cuando crees tu primer torneo, aquí aparecerán sus avances,
            resultados y actualizaciones importantes.
          </p>

          <Link
            href="/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-600/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:border-red-500/50 hover:bg-red-600 hover:text-white"
          >
            ＋ Crear mi primer torneo
          </Link>
        </div>
      </section>
    </div>
  );
}