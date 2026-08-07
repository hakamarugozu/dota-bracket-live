"use client";

import Link from "next/link";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

export default function Header() {
  const [loggingOut, setLoggingOut] =
    useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Error al cerrar sesión:",
        error.message,
      );

      setLoggingOut(false);
      return;
    }

    window.location.replace("/login");
  }

  return (
    <header className="border-b border-white/10 bg-[#02070d]">
      <div className="mx-auto flex min-h-[68px] w-full items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link
          href="/dashboard"
          className="flex items-center"
        >
          <span className="text-lg font-black tracking-tight text-white sm:text-xl">
            Esports Bracket{" "}
            <span className="text-red-500">
              Live
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
          <span className="hidden text-sm text-gray-500 xl:block">
            Plataforma Profesional de Torneos Multijuego
          </span>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white sm:px-4 sm:text-xs"
          >
            <span className="hidden sm:inline">
              ← VOLVER AL DASHBOARD
            </span>

            <span className="sm:hidden">
              ← DASHBOARD
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            disabled={loggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-[10px] font-black text-red-300 transition hover:border-red-500/60 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-xs"
          >
            <span>↪</span>

            <span className="hidden sm:inline">
              {loggingOut
                ? "CERRANDO..."
                : "CERRAR SESIÓN"}
            </span>

            <span className="sm:hidden">
              {loggingOut
                ? "..."
                : "SALIR"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}