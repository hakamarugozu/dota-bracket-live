"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({
  className = "",
}: LogoutButtonProps) {
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
    <button
      type="button"
      onClick={() => {
        void handleLogout();
      }}
      disabled={loggingOut}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-xs font-black text-red-300 transition hover:border-red-500/50 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true">↪</span>

      <span className="hidden sm:inline">
        {loggingOut
          ? "CERRANDO..."
          : "CERRAR SESIÓN"}
      </span>

      <span className="sm:hidden">
        {loggingOut ? "..." : "SALIR"}
      </span>
    </button>
  );
}