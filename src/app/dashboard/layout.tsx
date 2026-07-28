"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type DashboardLayoutProps = {
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: string;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    description: "Resumen general",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "Crear torneo",
    description: "Nuevo campeonato",
    href: "/create",
    icon: "＋",
  },
  {
    label: "Mis torneos",
    description: "Administrar eventos",
    href: "/tournaments",
    icon: "◆",
  },
  {
    label: "Torneos asignados",
    description: "Torneos donde colaboro",
    href: "/dashboard/assigned-tournaments",
    icon: "⚔",
  },
  {
    label: "Gestionar permisos",
    description: "Acceso del staff",
    href: "/dashboard/permissions",
    icon: "🔐",
  },
];

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUser(session.user);
      setLoadingSession(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setUser(null);
        router.replace("/login");
        return;
      }

      setUser(session.user);
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(
        "Error al cerrar sesión:",
        error.message,
      );

      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const fullName =
    typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "Administrador";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  if (loadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neutral-800 border-t-red-500" />

          <p className="mt-5 text-sm font-medium uppercase tracking-[0.24em] text-neutral-400">
            Cargando Esports Bracket Live
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-white/10 bg-[#0b0b0d] transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={closeMobileMenu}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/40 bg-red-600/10 shadow-[0_0_25px_rgba(220,38,38,0.15)]">
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

            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label="Cerrar menú"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-neutral-400 transition hover:border-white/20 hover:text-white lg:hidden"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-600">
            Administración
          </p>

          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : Boolean(
                      item.href &&
                        pathname.startsWith(item.href),
                    );

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
                    isActive
                      ? "border-red-500/30 bg-red-600/10 shadow-[inset_3px_0_0_0_rgba(239,68,68,1)]"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-white/[0.05] text-neutral-400"
                    }`}
                  >
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isActive
                          ? "text-white"
                          : "text-neutral-300"
                      }`}
                    >
                      {item.label}
                    </p>

                    <p
                      className={`mt-0.5 text-xs ${
                        isActive
                          ? "text-red-300/70"
                          : "text-neutral-600"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-800 text-sm font-black text-white">
                {initials || "EB"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {fullName}
                </p>

                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {user?.email ?? "Usuario conectado"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/40 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>↪</span>

            {loggingOut
              ? "Cerrando sesión..."
              : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[290px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070707]/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(true)
                }
                aria-label="Abrir menú"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xl text-neutral-300 transition hover:bg-white/[0.07] lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.22em] text-red-500">
                  Panel de administración
                </p>

                <h1 className="mt-1 truncate text-lg font-bold text-white">
                  Esports Bracket Live
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {fullName}
                </p>

                <p className="text-xs text-neutral-500">
                  Organizador
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-600/10 text-sm font-black text-red-400">
                {initials || "EB"}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}