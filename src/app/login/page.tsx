"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getSessionPersistencePreference,
  setSessionPersistence,
  supabase,
} from "@/lib/supabase";

const REMEMBERED_EMAIL_KEY =
  "esports-bracket-live:remembered-email";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    rememberSession,
    setRememberSession,
  ] = useState(true);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    let mounted = true;

    function loadSavedPreferences() {
      setRememberSession(
        getSessionPersistencePreference()
      );

      try {
        const rememberedEmail =
          window.localStorage.getItem(
            REMEMBERED_EMAIL_KEY
          );

        if (rememberedEmail) {
          setEmail(rememberedEmail);
        }
      } catch {
        // El navegador no permitió acceder al almacenamiento.
      }
    }

    async function checkExistingSession() {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (
          mounted &&
          session
        ) {
          router.replace(
            "/dashboard"
          );

          router.refresh();

          return;
        }
      } catch (error) {
        console.error(
          "No se pudo comprobar la sesión:",
          error
        );
      }

      if (mounted) {
        setCheckingSession(false);
      }
    }

    loadSavedPreferences();

    void checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !password
    ) {
      setErrorMessage(
        "Completa todos los campos."
      );

      return;
    }

    setLoading(true);

    try {
      /**
       * Debe establecerse antes de iniciar sesión,
       * para que Supabase guarde los tokens en el
       * almacenamiento elegido.
       */
      setSessionPersistence(
        rememberSession
      );

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: normalizedEmail,
            password,
          }
        );

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error(
          "No se pudo iniciar la sesión."
        );
      }

      try {
        if (rememberSession) {
          window.localStorage.setItem(
            REMEMBERED_EMAIL_KEY,
            normalizedEmail
          );
        } else {
          window.localStorage.removeItem(
            REMEMBERED_EMAIL_KEY
          );
        }
      } catch {
        // El inicio de sesión continúa aunque
        // el navegador no permita guardar el correo.
      }

      setMessage(
        "Inicio de sesión correcto."
      );

      router.replace(
        "/dashboard"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Error al iniciar sesión:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.18),transparent_35%)]" />

        <div className="relative text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
            Esports Bracket Live
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-8 text-white sm:px-6 lg:flex lg:items-center lg:py-12">
      {/* Fondo rojo y negro */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(220,38,38,0.25),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(127,29,29,0.20),transparent_32%),linear-gradient(135deg,#020202_0%,#090909_50%,#020202_100%)]" />

      {/* Cuadrícula sutil */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

      {/* Luces decorativas */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-red-600/10 blur-[120px]" />

      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-red-950/30 blur-[130px]" />

      <div className="pointer-events-none absolute left-[8%] top-0 h-px w-[45%] bg-gradient-to-r from-transparent via-red-600/70 to-transparent" />

      <div className="pointer-events-none absolute bottom-0 right-[5%] h-px w-[45%] bg-gradient-to-r from-transparent via-red-800/60 to-transparent" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Presentación de la plataforma */}
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-3 rounded-full border border-red-500/25 bg-red-600/10 px-4 py-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.9)]" />

            <span className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
              Plataforma multijuego
            </span>
          </div>

          <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.05] tracking-tight xl:text-7xl">
            CREA.
            <br />

            <span className="text-red-500">
              COMPITE.
            </span>
            <br />

            DOMINA.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-gray-400">
            Organiza torneos profesionales,
            administra participantes y controla
            cada fase de la competencia desde
            un solo lugar.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <FeatureBadge>
              🏆 Eliminación simple
            </FeatureBadge>

            <FeatureBadge>
              ⚔️ Eliminación doble
            </FeatureBadge>

            <FeatureBadge>
              📺 Stream oficial
            </FeatureBadge>

            <FeatureBadge>
              🎮 Multijuego
            </FeatureBadge>
          </div>

          <div className="mt-12 flex items-center gap-4 border-t border-white/10 pt-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-600/10 text-xl font-black text-red-500">
              E
            </div>

            <div>
              <p className="font-black uppercase tracking-[0.18em] text-white">
                Esports Bracket Live
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Torneos profesionales para tus juegos favoritos
              </p>
            </div>
          </div>
        </section>

        {/* Formulario */}
        <section className="mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-red-500/35 bg-[#101010]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_45px_rgba(220,38,38,0.10)] backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />

            <div className="relative">
<div className="mx-auto flex w-full justify-center">
  <Image
    src="/esports-bracket-live-logo.png"
    alt="Esports Bracket Live"
    width={747}
    height={550}
    priority
    unoptimized
    className="h-auto w-full max-w-[300px] object-contain drop-shadow-[0_0_28px_rgba(220,38,38,0.25)] sm:max-w-[330px]"
  />
</div>
             <p className="mb-8 mt-1 text-center text-sm leading-6 text-gray-400">
  Inicia sesión para administrar tus torneos.
</p>

              <form
                onSubmit={handleLogin}
                autoComplete="on"
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-black/70 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Contraseña
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-black/70 px-4 py-3.5 pr-24 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      disabled={loading}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-[10px] font-black uppercase tracking-wide text-gray-500 transition hover:text-red-400 disabled:cursor-not-allowed"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword
                        ? "Ocultar"
                        : "Mostrar"}
                    </button>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-black text-red-500 transition hover:text-red-400"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition hover:border-red-500/20 hover:bg-red-500/[0.04]">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(event) =>
                      setRememberSession(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-gray-300">
                      Mantener mi sesión iniciada
                    </span>

                    <span className="mt-1 block text-[11px] leading-5 text-gray-600">
                      Permanecerás conectado hasta
                      que cierres sesión.
                    </span>
                  </span>
                </label>

                {errorMessage && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm leading-6 text-red-300">
                    {errorMessage}
                  </div>
                )}

                {message && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm leading-6 text-emerald-300">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-3.5 font-black text-white shadow-[0_12px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_16px_40px_rgba(220,38,38,0.30)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading
                    ? "INGRESANDO..."
                    : "INICIAR SESIÓN"}

                  {!loading && (
                    <span className="transition group-hover:translate-x-1">
                      →
                    </span>
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-gray-500">
                ¿No tienes una cuenta?

                <Link
                  href="/register"
                  className="ml-2 font-black text-red-500 transition hover:text-red-400"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700">
            © 2026 Esports Bracket Live
          </p>
        </section>
      </div>
    </main>
  );
}

function FeatureBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-bold text-gray-300 backdrop-blur-sm">
      {children}
    </div>
  );
}