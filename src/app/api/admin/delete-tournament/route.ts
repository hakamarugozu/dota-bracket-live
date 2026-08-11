import {
  NextResponse,
} from "next/server";

import {
  createSupabaseAdminClient,
  verifySuperAdminRequest,
} from "@/lib/admin";

import {
  listStorageFolderObjects,
  removeStorageObjects,
} from "@/lib/admin-storage";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeleteTournamentBody = {
  tournamentId?: unknown;
};

function getTournamentId(
  body: DeleteTournamentBody,
): string | null {
  if (
    typeof body.tournamentId !==
    "string"
  ) {
    return null;
  }

  const normalized =
    body.tournamentId.trim();

  if (
    !UUID_PATTERN.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}

export async function DELETE(
  request: Request,
) {
  const isSuperAdmin =
    await verifySuperAdminRequest(
      request,
    );

  if (!isSuperAdmin) {
    return NextResponse.json(
      {
        message:
          "Acceso no autorizado.",
      },
      {
        status: 403,
      },
    );
  }

  let body: DeleteTournamentBody;

  try {
    body =
      (await request.json()) as
        DeleteTournamentBody;
  } catch {
    return NextResponse.json(
      {
        message:
          "La solicitud no es válida.",
      },
      {
        status: 400,
      },
    );
  }

  const tournamentId =
    getTournamentId(body);

  if (!tournamentId) {
    return NextResponse.json(
      {
        message:
          "El identificador del torneo no es válido.",
      },
      {
        status: 400,
      },
    );
  }

  const supabaseAdmin =
    createSupabaseAdminClient();

  const {
    data: tournament,
    error: tournamentError,
  } = await supabaseAdmin
    .from("tournaments")
    .select(
      `
        id,
        name
      `,
    )
    .eq(
      "id",
      tournamentId,
    )
    .maybeSingle();

  if (tournamentError) {
    console.error(
      "Error comprobando torneo para Super Admin:",
      tournamentError,
    );

    return NextResponse.json(
      {
        message:
          "No se pudo comprobar el torneo.",
      },
      {
        status: 500,
      },
    );
  }

  if (!tournament) {
    return NextResponse.json(
      {
        message:
          "El torneo ya no existe.",
      },
      {
        status: 404,
      },
    );
  }

  let tournamentStorageObjects = [];

  try {
    tournamentStorageObjects =
      await listStorageFolderObjects(
        supabaseAdmin,
        "team-logos",
        tournamentId,
      );
  } catch (error) {
    console.error(
      "Error preparando limpieza de Storage:",
      error,
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron comprobar los archivos del torneo.",
      },
      {
        status: 500,
      },
    );
  }

  const {
    data: deletedTournament,
    error: deleteError,
  } = await supabaseAdmin
    .from("tournaments")
    .delete()
    .eq(
      "id",
      tournamentId,
    )
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error(
      "Error eliminando torneo desde Super Admin:",
      deleteError,
    );

    return NextResponse.json(
      {
        message:
          "No se pudo eliminar el torneo.",
      },
      {
        status: 500,
      },
    );
  }

  if (!deletedTournament) {
    return NextResponse.json(
      {
        message:
          "El torneo no pudo eliminarse.",
      },
      {
        status: 500,
      },
    );
  }

  let storageWarning:
    string | null = null;

  if (
    tournamentStorageObjects.length >
    0
  ) {
    try {
      await removeStorageObjects(
        supabaseAdmin,
        tournamentStorageObjects,
      );
    } catch (error) {
      console.error(
        "El torneo fue eliminado pero falló la limpieza de Storage:",
        error,
      );

      storageWarning =
        "El torneo fue eliminado, pero algunos archivos antiguos de Storage podrían requerir limpieza manual.";
    }
  }

  return NextResponse.json({
    deleted: true,
    tournamentId,
    tournamentName:
      tournament.name,
    storageWarning,
  });
}