"use client";

import {
  FormEvent,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleRecovery(
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

    if (!normalizedEmail) {
      setErrorMessage(
        "Ingresa tu correo electrónico."
      );

      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      setMessage(
        "Si el correo pertenece a una cuenta de Esports Bracket Live, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam."
      );
    } catch (error) {
      console.error(
        "Error solicitando recuperación de contraseña:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el correo de recuperación."
      );
    } finally {
      setLoading(false);
    }
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

            <h1 className="mt-2 text-center text-2xl font-black text-white">
              Recuperar contraseña
            </h1>

            <p className="mb-8 mt-3 text-center text-sm leading-6 text-gray-400">
              Escribe el correo con el que creaste tu cuenta. Te enviaremos un enlace para elegir una contraseña nueva.
            </p>

            <form
              onSubmit={handleRecovery}
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
                  ? "ENVIANDO..."
                  : "ENVIAR ENLACE"}

                {!loading && (
                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-gray-500">
              ¿Recordaste tu contraseña?

              <Link
                href="/login"
                className="ml-2 font-black text-red-500 transition hover:text-red-400"
              >
                Volver al login
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700">
          © 2026 Esports Bracket Live
        </p>
      </section>
    </main>
  );
}