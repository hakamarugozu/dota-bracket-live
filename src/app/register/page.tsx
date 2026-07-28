"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

function getRegistrationErrorMessage(
  message: string,
) {
  const normalizedMessage =
    message.toLowerCase();

  if (
    normalizedMessage.includes(
      "user already registered",
    ) ||
    normalizedMessage.includes(
      "already been registered",
    ) ||
    normalizedMessage.includes(
      "already registered",
    )
  ) {
    return "Ya existe una cuenta registrada con ese correo electrónico.";
  }

  if (
    normalizedMessage.includes(
      "database error saving new user",
    ) ||
    normalizedMessage.includes(
      "duplicate key",
    ) ||
    normalizedMessage.includes(
      "unique constraint",
    )
  ) {
    return "Este nombre de usuario ya está en uso.";
  }

  if (
    normalizedMessage.includes(
      "password should be at least",
    )
  ) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  return message;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password
    ) {
      setErrorMessage(
        "Completa todos los campos.",
      );

      return;
    }

    if (
      normalizedName.length < 3
    ) {
      setErrorMessage(
        "El nombre de usuario debe tener al menos 3 caracteres.",
      );

      return;
    }

    if (
      normalizedName.length > 30
    ) {
      setErrorMessage(
        "El nombre de usuario no puede superar los 30 caracteres.",
      );

      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "La contraseña debe tener al menos 6 caracteres.",
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data: usernameAvailable,
        error: availabilityError,
      } = await supabase.rpc(
        "is_username_available",
        {
          p_username:
            normalizedName,
        },
      );

      if (availabilityError) {
        throw new Error(
          "No se pudo comprobar la disponibilidad del nombre de usuario. Inténtalo nuevamente.",
        );
      }

      if (usernameAvailable !== true) {
        setErrorMessage(
          "Este nombre de usuario ya está en uso.",
        );

        return;
      }

      const {
        data,
        error,
      } = await supabase.auth.signUp(
        {
          email: normalizedEmail,
          password,
          options: {
            data: {
              username:
                normalizedName,

              full_name:
                normalizedName,
            },
          },
        },
      );

      if (error) {
        setErrorMessage(
          getRegistrationErrorMessage(
            error.message,
          ),
        );

        return;
      }

      if (data.session) {
        setMessage(
          "¡Cuenta registrada correctamente! Redirigiendo al Dashboard...",
        );

        setName("");
        setEmail("");
        setPassword("");

        window.setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 2000);

        return;
      }

      setMessage(
        "¡Cuenta creada correctamente! Revisa tu correo electrónico para confirmar la cuenta.",
      );

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la cuenta.",
      );
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    if (message) {
      setMessage("");
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="w-full max-w-md rounded-2xl border border-red-600 bg-neutral-900 p-8 shadow-2xl">
        <h1 className="text-center text-4xl font-bold text-red-500">
          Dota Bracket Live
        </h1>

        <p className="mb-8 mt-3 text-center text-gray-400">
          Crea tu cuenta para comenzar.
        </p>

        <form
          onSubmit={handleRegister}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-gray-300"
            >
              Nombre de usuario
            </label>

            <input
              id="username"
              type="text"
              placeholder="Ejemplo: yiyo"
              value={name}
              onChange={(event) => {
                setName(
                  event.target.value,
                );

                clearMessages();
              }}
              disabled={loading}
              minLength={3}
              maxLength={30}
              autoComplete="username"
              className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500 disabled:opacity-60"
            />

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Este nombre será único y también podrá utilizarse para recibir permisos en torneos.
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-gray-300"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(event) => {
                setEmail(
                  event.target.value,
                );

                clearMessages();
              }}
              disabled={loading}
              autoComplete="email"
              className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-gray-300"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value,
                );

                clearMessages();
              }}
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500 disabled:opacity-60"
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
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creando cuenta..."
              : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-400">
          ¿Ya tienes una cuenta?

          <Link
            href="/login"
            className="ml-2 font-semibold text-red-500 hover:text-red-400"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}