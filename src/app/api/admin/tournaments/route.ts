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
  } = await supabaseAdmin
    .from("tournaments")
    .select(
      `
        id,
        name,
        game,
        format,
        mode,
        teams,
        status,
        date,
        created_at,
        user_id
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error cargando torneos para Super Admin:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "No se pudieron cargar los torneos.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    tournaments: data ?? [],
  });
}