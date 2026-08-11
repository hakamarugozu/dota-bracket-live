import "server-only";

import { createClient } from "@supabase/supabase-js";

function getRequiredEnvironmentVariable(
  name: string,
  value: string | undefined,
): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `Falta configurar la variable ${name}.`,
    );
  }

  return normalizedValue;
}

function getSuperAdminUserId(): string {
  return getRequiredEnvironmentVariable(
    "SUPER_ADMIN_USER_ID",
    process.env.SUPER_ADMIN_USER_ID,
  );
}

export function isSuperAdminUserId(
  userId: string | null | undefined,
): boolean {
  if (!userId) {
    return false;
  }

  return userId === getSuperAdminUserId();
}

function getBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token?.trim()
  ) {
    return null;
  }

  return token.trim();
}

export async function verifySuperAdminRequest(
  request: Request,
): Promise<boolean> {
  const accessToken =
    getBearerToken(request);

  if (!accessToken) {
    return false;
  }

  const supabaseUrl =
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );

  const supabaseAnonKey =
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

  const serverSupabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const {
    data: { user },
    error,
  } = await serverSupabase.auth.getUser(
    accessToken,
  );

  if (error || !user) {
    return false;
  }

  return isSuperAdminUserId(user.id);
}

export function createSupabaseAdminClient() {
  const supabaseUrl =
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );

  const supabaseSecretKey =
    getRequiredEnvironmentVariable(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY,
    );

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}