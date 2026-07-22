"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setMessage("");
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Completa todos los campos.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Inicio de sesión correcto.");

    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-neutral-900 border border-red-600 rounded-2xl shadow-2xl p-8">

        <h1 className="text-4xl font-bold text-red-500 text-center">
          Dota Bracket Live
        </h1>

        <p className="text-center text-gray-400 mt-3 mb-8">
          Inicia sesión para administrar tus torneos.
        </p>

        <div className="space-y-5">

          <div>
            <label className="block text-gray-300 mb-2">
              Correo electrónico
            </label>

            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white outline-none focus:border-red-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Contraseña
            </label>

            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white outline-none focus:border-red-500 disabled:opacity-60"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-600 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-green-600 bg-green-950/40 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 transition py-3 rounded-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

        </div>

        <div className="mt-8 text-center text-gray-400">
          ¿No tienes una cuenta?

          <Link
            href="/register"
            className="text-red-500 hover:text-red-400 ml-2 font-semibold"
          >
            Crear cuenta
          </Link>
        </div>

      </div>
    </main>
  );
}