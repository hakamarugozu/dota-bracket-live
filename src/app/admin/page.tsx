"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type AdminStatus =
  | "checking"
  | "authorized"
  | "denied";

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Nunca";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat(
    "es-BO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default function AdminPage() {
  const [status, setStatus] =
    useState<AdminStatus>("checking");

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(false);

  const [
    usersError,
    setUsersError,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminPanel() {
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

        const authorizationHeader = {
          Authorization:
            `Bearer ${session.access_token}`,
        };

        const checkResponse = await fetch(
          "/api/admin/check",
          {
            method: "GET",
            headers: authorizationHeader,
            cache: "no-store",
          },
        );

        if (!checkResponse.ok) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        const checkData =
          (await checkResponse.json()) as {
            authorized?: boolean;
          };

        if (!checkData.authorized) {
          if (!cancelled) {
            setStatus("denied");
          }

          return;
        }

        if (cancelled) {
          return;
        }

        setStatus("authorized");
        setLoadingUsers(true);
        setUsersError("");

        const usersResponse = await fetch(
          "/api/admin/users",
          {
            method: "GET",
            headers: authorizationHeader,
            cache: "no-store",
          },
        );

        if (cancelled) {
          return;
        }

        if (!usersResponse.ok) {
          setUsers([]);
          setUsersError(
            "No se pudieron cargar los usuarios.",
          );
          return;
        }

        const usersData =
          (await usersResponse.json()) as {
            users?: AdminUser[];
          };

        setUsers(usersData.users ?? []);
      } catch (error) {
        console.error(
          "Error cargando Super Admin:",
          error,
        );

        if (!cancelled) {
          setUsers([]);
          setUsersError(
            "No se pudo cargar el panel administrativo.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    }

    void loadAdminPanel();

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
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#101012] to-[#09090a] p-6 shadow-2xl sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                ✓ Acceso verificado
              </div>

              <h1 className="mt-5 text-3xl font-black sm:text-4xl">
                Super Admin
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
                Centro privado de administración de
                Esports Bracket Live.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-fit rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Usuarios registrados
            </p>

            <p className="mt-3 text-4xl font-black text-white">
              {loadingUsers ? "—" : users.length}
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Cuentas registradas en la plataforma
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Seguridad
            </p>

            <p className="mt-3 text-lg font-black text-emerald-300">
              Protegido
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Acceso exclusivo del propietario
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101012] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-600">
              Modo actual
            </p>

            <p className="mt-3 text-lg font-black text-white">
              Solo lectura
            </p>

            <p className="mt-2 text-xs text-neutral-600">
              Ninguna acción destructiva habilitada
            </p>
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#101012]">
          <header className="border-b border-white/10 px-5 py-5 sm:px-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
              Administración
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Usuarios registrados
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Cuentas existentes en Esports Bracket Live.
            </p>
          </header>

          {loadingUsers ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />

                <p className="mt-4 text-sm font-bold text-neutral-500">
                  Cargando usuarios...
                </p>
              </div>
            </div>
          ) : usersError ? (
            <div className="px-6 py-10">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4 text-sm font-semibold text-red-300">
                {usersError}
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
              <div>
                <div className="text-3xl">
                  👥
                </div>

                <h3 className="mt-4 text-lg font-black">
                  No hay usuarios
                </h3>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-600/10 text-sm font-black uppercase text-red-300">
                        {(user.email.charAt(0) || "U").toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white sm:text-base">
                          {user.email || "Sin correo"}
                        </p>

                        <p className="mt-1 truncate font-mono text-[11px] text-neutral-700">
                          {user.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-700">
                      Registrado
                    </p>

                    <p className="mt-1 text-sm font-semibold text-neutral-400">
                      {formatDate(user.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-700">
                      Último acceso
                    </p>

                    <p className="mt-1 text-sm font-semibold text-neutral-400">
                      {formatDate(
                        user.last_sign_in_at,
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}