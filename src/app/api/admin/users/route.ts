import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  verifySuperAdminRequest,
} from "@/lib/admin";

export async function GET(
  request: Request,
) {
  const isSuperAdmin =
    await verifySuperAdminRequest(request);

  if (!isSuperAdmin) {
    return NextResponse.json(
      {
        message: "Acceso no autorizado.",
      },
      {
        status: 403,
      },
    );
  }

  const supabaseAdmin =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error(
      "Error cargando usuarios para Super Admin:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "No se pudieron cargar los usuarios.",
      },
      {
        status: 500,
      },
    );
  }

  const users = data.users.map(
    (user) => ({
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
      last_sign_in_at:
        user.last_sign_in_at ?? null,
    }),
  );

  return NextResponse.json({
    users,
  });
}