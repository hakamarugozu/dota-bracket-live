"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    checkingRecovery,
    setCheckingRecovery,
  ] = useState(true);

  const [
    recoveryReady,
    setRecoveryReady,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setRecoveryReady(true);
          setCheckingRecovery(false);
          setErrorMessage("");
        }
      }
    );

    async function checkRecoverySession() {
      const currentUrl =
        new URL(window.location.href);

      const urlError =
        currentUrl.searchParams.get(
          "error_description"
        );

      if (urlError) {
        if (mounted) {
          setRecoveryReady(false);
          setCheckingRecovery(false);
          setErrorMessage(
            "El enlace de recuperación no es válido o ya venció. Solicita uno nuevo."
          );
        }

        return;
      }

      try {
        const {
          data: { session },
          error,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          throw error;
        }

        if (!session) {
          setRecoveryReady(false);
          setErrorMessage(
            "No se pudo validar el enlace de recuperación. Solicita uno nuevo desde el login."
          );
        } else {
          setRecoveryReady(true);
          setErrorMessage("");
        }
      } catch (error) {
        console.error(
          "Error validando recuperación de contraseña:",
          error
        );

        if (mounted) {
          setRecoveryReady(false);
          setErrorMessage(
            "No se pudo validar el enlace de recuperación. Solicita uno nuevo desde el login."
          );
        }
      } finally {
        if (mounted) {
          setCheckingRecovery(false);
        }
      }
    }

    void checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      loading ||
      !recoveryReady
    ) {
      return;
    }

    setErrorMessage("");

    if (
      !password ||
      !confirmPassword
    ) {
      setErrorMessage(
        "Completa los dos campos de contraseña."
      );

      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "Las contraseñas no coinciden."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        error,
      } =
        await supabase.auth.updateUser(
          {
            password,
          }
        );

      if (error) {
        throw error;
      }

      const {
        error: signOutError,
      } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (signOutError) {
        console.error(
          "La contraseña cambió, pero no se pudo cerrar la sesión de recuperación:",
          signOutError
        );
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setRecoveryReady(false);
    } catch (error) {
      console.error(
        "Error actualizando contraseña:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contraseña."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingRecovery) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.18),transparent_35%)]" />

        <div className="relative text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
            Validando recuperación
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(220,38,38,0.25),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(127,29,29,0.20),transparent_32%),linear-gradient(135deg,#020202_0%,#090909_50%,#020202_100%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />

      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-red-600/10 blur-[120px]" />

      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-red-950/30 blur-[130px]" />

      <section className="relative w-full max-w-md">
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
                className="h-auto w-full max-w-[280px] object-contain drop-shadow-[0_0_28px_rgba(220,38,38,0.25)]"
              />
            </div>

            {success ? (
              <div className="text-center">
                <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-3xl text-emerald-300">
                  ✓
                </div>

                <h1 className="mt-5 text-2xl font-black text-white">
                  Contraseña actualizada
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con la nueva contraseña.
                </p>

                <Link
                  href="/login"
                  className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-3.5 font-black text-white shadow-[0_12px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500"
                >
                  IR AL LOGIN
                  <span>→</span>
                </Link>
              </div>
            ) : recoveryReady ? (
              <>
                <h1 className="mt-2 text-center text-2xl font-black text-white">
                  Nueva contraseña
                </h1>

                <p className="mb-8 mt-3 text-center text-sm leading-6 text-gray-400">
                  Elige una contraseña nueva para tu cuenta de Esports Bracket Live.
                </p>

                <form
                  onSubmit={handleResetPassword}
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-gray-300"
                    >
                      Nueva contraseña
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
                        autoComplete="new-password"
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
                      >
                        {showPassword
                          ? "Ocultar"
                          : "Mostrar"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-2 block text-sm font-semibold text-gray-300"
                    >
                      Confirmar contraseña
                    </label>

                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-black/70 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10 disabled:opacity-60"
                    />

                    <p className="mt-2 text-[11px] leading-5 text-gray-600">
                      Mínimo 6 caracteres.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm leading-6 text-red-300">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-3.5 font-black text-white shadow-[0_12px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_16px_40px_rgba(220,38,38,0.30)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading
                      ? "ACTUALIZANDO..."
                      : "CAMBIAR CONTRASEÑA"}

                    {!loading && (
                      <span className="transition group-hover:translate-x-1">
                        →
                      </span>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-2xl font-black text-red-300">
                  !
                </div>

                <h1 className="mt-5 text-2xl font-black text-white">
                  Enlace no disponible
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {errorMessage ||
                    "El enlace de recuperación no pudo validarse."}
                </p>

                <Link
                  href="/forgot-password"
                  className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-3.5 font-black text-white shadow-[0_12px_35px_rgba(220,38,38,0.22)] transition hover:-translate-y-0.5 hover:bg-red-500"
                >
                  SOLICITAR OTRO ENLACE
                  <span>→</span>
                </Link>

                <Link
                  href="/login"
                  className="mt-4 inline-flex text-sm font-black text-gray-500 transition hover:text-red-400"
                >
                  Volver al login
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700">
          © 2026 Esports Bracket Live
        </p>
      </section>
    </main>
  );
}