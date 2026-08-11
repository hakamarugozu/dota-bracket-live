"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type AdminStatus =
  | "checking"
  | "authorized"
  | "denied";

export default function AdminPage() {
  const [status, setStatus] =
    useState<AdminStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.access_token
        ) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        const response = await fetch(
          "/api/admin/check",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        const data = (await response.json()) as {
          authorized?: boolean;
        };

        if (!cancelled) {
          setStatus(
            data.authorized
              ? "authorized"
              : "denied",
          );
        }
      } catch (error) {
        console.error(
          "Error verificando acceso de administrador:",
          error,
        );

        if (!cancelled) {
          setStatus("denied");
        }
      }
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
            Verificando acceso
          </p>
        </div>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#111113] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-600/10 text-2xl">
            🔒
          </div>

          <h1 className="mt-6 text-2xl font-black">
            Acceso denegado
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Esta sección está reservada exclusivamente
            para el propietario de Esports Bracket Live.
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-500"
          >
            Volver al Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-6 py-10 text-white">
      <div className="mx-auto max-w-[1500px]">
        <section className="rounded-3xl border border-emerald-500/20 bg-[#101012] p-8">
          <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
            ✓ Acceso verificado
          </div>

          <h1 className="mt-6 text-4xl font-black">
            Super Admin
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
            Has sido identificado como propietario de
            Esports Bracket Live.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-sm font-bold text-white">
              Panel administrativo protegido correctamente.
            </p>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Los módulos de usuarios y torneos se agregarán
              después de comprobar completamente esta
              protección.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}