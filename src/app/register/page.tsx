"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister() {
    setMessage("");
    setErrorMessage("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("¡Cuenta creada correctamente!");

    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-neutral-900 border border-red-600 rounded-2xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-red-500 text-center">
          Dota Bracket Live
        </h1>

        <p className="text-center text-gray-400 mt-3 mb-8">
          Crea tu cuenta para comenzar.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-gray-300 mb-2">
              Nombre
            </label>

            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={loading}
              className="w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white outline-none focus:border-red-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Correo electrónico
            </label>

            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 transition py-3 rounded-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </div>

        <div className="mt-8 text-center text-gray-400">
          ¿Ya tienes una cuenta?

          <Link
            href="/login"
            className="text-red-500 hover:text-red-400 ml-2 font-semibold"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}