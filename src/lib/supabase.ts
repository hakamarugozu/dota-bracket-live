import {
  createClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SESSION_PREFERENCE_KEY =
  "esports-bracket-live:remember-session";

if (
  !supabaseUrl ||
  !supabaseAnonKey
) {
  throw new Error(
    "Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Devuelve true cuando la sesión debe permanecer
 * incluso después de cerrar el navegador.
 *
 * La primera vez está activado por defecto.
 */
export function getSessionPersistencePreference(): boolean {
  const localStorage =
    getLocalStorage();

  if (!localStorage) {
    return true;
  }

  return (
    localStorage.getItem(
      SESSION_PREFERENCE_KEY
    ) !== "false"
  );
}

/**
 * Define dónde guardará Supabase la sesión:
 *
 * true  -> localStorage
 * false -> sessionStorage
 */
export function setSessionPersistence(
  rememberSession: boolean
): void {
  const localStorage =
    getLocalStorage();

  if (!localStorage) {
    return;
  }

  localStorage.setItem(
    SESSION_PREFERENCE_KEY,
    String(rememberSession)
  );
}

/**
 * Almacenamiento personalizado para Supabase Auth.
 *
 * Cuando "Mantener mi sesión iniciada" está activo,
 * utiliza localStorage.
 *
 * Cuando está desactivado, utiliza sessionStorage.
 */
const authStorage = {
  getItem(key: string): string | null {
    const localStorage =
      getLocalStorage();

    const sessionStorage =
      getSessionStorage();

    const rememberSession =
      getSessionPersistencePreference();

    if (rememberSession) {
      return (
        localStorage?.getItem(key) ??
        sessionStorage?.getItem(key) ??
        null
      );
    }

    return (
      sessionStorage?.getItem(key) ??
      null
    );
  },

  setItem(
    key: string,
    value: string
  ): void {
    const localStorage =
      getLocalStorage();

    const sessionStorage =
      getSessionStorage();

    const rememberSession =
      getSessionPersistencePreference();

    if (rememberSession) {
      localStorage?.setItem(
        key,
        value
      );

      sessionStorage?.removeItem(
        key
      );

      return;
    }

    sessionStorage?.setItem(
      key,
      value
    );

    localStorage?.removeItem(
      key
    );
  },

  removeItem(key: string): void {
    getLocalStorage()?.removeItem(
      key
    );

    getSessionStorage()?.removeItem(
      key
    );
  },
};

export const supabase =
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authStorage,
      },
    }
  );