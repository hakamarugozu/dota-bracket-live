import {
  NextResponse,
} from "next/server";

import {
  createSupabaseAdminClient,
  isSuperAdminUserId,
  verifySuperAdminRequest,
} from "@/lib/admin";

import {
  listStorageFolderObjects,
  mergeStorageObjects,
  removeStorageObjects,
  type AdminStorageObject,
} from "@/lib/admin-storage";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeleteUserBody = {
  userId?: unknown;
};

type StorageObjectRow = {
  bucket_id: string;
  object_name: string;
};

function getUserId(
  body: DeleteUserBody,
): string | null {
  if (
    typeof body.userId !==
    "string"
  ) {
    return null;
  }

  const normalized =
    body.userId.trim();

  if (
    !UUID_PATTERN.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}

async function clearDeletedTeamLogoReferences(
  supabaseAdmin:
    ReturnType<
      typeof createSupabaseAdminClient
    >,
  objects: AdminStorageObject[],
) {
  const teamLogoObjects =
    objects.filter(
      (object) =>
        object.bucketId ===
        "team-logos",
    );

  if (
    teamLogoObjects.length === 0
  ) {
    return;
  }

  const publicUrls =
    teamLogoObjects.map(
      (object) =>
        supabaseAdmin.storage
          .from("team-logos")
          .getPublicUrl(
            object.path,
          )
          .data.publicUrl,
    );

  const batchSize = 100;

  for (
    let index = 0;
    index < publicUrls.length;
    index += batchSize
  ) {
    const batch =
      publicUrls.slice(
        index,
        index + batchSize,
      );

    const {
      error,
    } = await supabaseAdmin
      .from("teams")
      .update({
        logo: null,
      })
      .in(
        "logo",
        batch,
      );

    if (error) {
      throw new Error(
        `No se pudieron limpiar referencias de logos: ${error.message}`,
      );
    }
  }
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

  let body: DeleteUserBody;

  try {
    body =
      (await request.json()) as
        DeleteUserBody;
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

  const userId =
    getUserId(body);

  if (!userId) {
    return NextResponse.json(
      {
        message:
          "El identificador del usuario no es válido.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * PROTECCIÓN ABSOLUTA:
   *
   * aunque alguien manipule el navegador
   * y llame directamente a este endpoint,
   * la cuenta configurada como
   * SUPER_ADMIN_USER_ID no puede borrarse.
   */
  if (
    isSuperAdminUserId(userId)
  ) {
    return NextResponse.json(
      {
        message:
          "La cuenta Super Admin está protegida y no puede eliminarse.",
      },
      {
        status: 403,
      },
    );
  }

  const supabaseAdmin =
    createSupabaseAdminClient();

  const {
    data: targetUserData,
    error: targetUserError,
  } =
    await supabaseAdmin.auth.admin
      .getUserById(userId);

  if (
    targetUserError ||
    !targetUserData.user
  ) {
    return NextResponse.json(
      {
        message:
          "La cuenta ya no existe o no pudo ser encontrada.",
      },
      {
        status: 404,
      },
    );
  }

  /*
   * Primero identificamos todos los torneos
   * propios de esta cuenta.
   */
  const {
    data: ownedTournaments,
    error: ownedTournamentsError,
  } = await supabaseAdmin
    .from("tournaments")
    .select("id")
    .eq(
      "user_id",
      userId,
    );

  if (ownedTournamentsError) {
    console.error(
      "Error consultando torneos del usuario:",
      ownedTournamentsError,
    );

    return NextResponse.json(
      {
        message:
          "No se pudieron comprobar los torneos de la cuenta.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Después consultamos todos los objetos
   * de Storage cuyo owner_id pertenece
   * realmente a la cuenta.
   *
   * Esto también detecta imágenes que
   * hubiera subido como colaborador
   * dentro de un torneo ajeno.
   */
  const {
    data: ownedStorageRows,
    error: storageLookupError,
  } =
    await supabaseAdmin.rpc(
      "admin_list_storage_objects_by_owner",
      {
        p_owner_id: userId,
      },
    );

  if (storageLookupError) {
    console.error(
      "Error consultando objetos de Storage del usuario:",
      storageLookupError,
    );

    return NextResponse.json(
      {
        message:
          "No se pudieron comprobar los archivos pertenecientes a la cuenta.",
      },
      {
        status: 500,
      },
    );
  }

  const ownedStorageObjects =
    (
      (ownedStorageRows ?? []) as
        StorageObjectRow[]
    ).map(
      (row): AdminStorageObject => ({
        bucketId:
          row.bucket_id,
        path:
          row.object_name,
      }),
    );

  /*
   * También eliminamos todos los archivos
   * de los torneos que van a desaparecer,
   * aunque alguno haya sido subido por
   * un colaborador distinto.
   */
  const tournamentStorageObjects:
    AdminStorageObject[] = [];

  try {
    for (
      const tournament
      of ownedTournaments ?? []
    ) {
      const tournamentObjects =
        await listStorageFolderObjects(
          supabaseAdmin,
          "team-logos",
          tournament.id,
        );

      tournamentStorageObjects.push(
        ...tournamentObjects,
      );
    }
  } catch (error) {
    console.error(
      "Error consultando Storage de los torneos del usuario:",
      error,
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron comprobar los archivos de los torneos.",
      },
      {
        status: 500,
      },
    );
  }

  const allStorageObjects =
    mergeStorageObjects(
      ownedStorageObjects,
      tournamentStorageObjects,
    );

  /*
   * Si el usuario subió un logo en un
   * torneo ajeno, al borrar ese objeto
   * limpiamos primero la URL de teams
   * para no dejar una imagen rota.
   */
  try {
    await clearDeletedTeamLogoReferences(
      supabaseAdmin,
      ownedStorageObjects,
    );
  } catch (error) {
    console.error(
      "Error limpiando referencias de Storage:",
      error,
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron preparar los datos para eliminar la cuenta.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Supabase Auth no permite borrar
   * usuarios que todavía poseen objetos
   * en Storage.
   *
   * Por eso eliminamos esos objetos
   * antes de tocar auth.users.
   */
  try {
    await removeStorageObjects(
      supabaseAdmin,
      allStorageObjects,
    );
  } catch (error) {
    console.error(
      "Error eliminando Storage del usuario:",
      error,
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron eliminar los archivos pertenecientes a la cuenta.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Limpieza transaccional de:
   *
   * - permisos como colaborador
   * - torneos propios
   * - brackets por CASCADE
   * - teams por CASCADE
   * - permisos del torneo por CASCADE
   * - profile
   */
  const {
    data: deletedTournamentIds,
    error: publicCleanupError,
  } =
    await supabaseAdmin.rpc(
      "admin_delete_user_public_data",
      {
        p_user_id: userId,
      },
    );

  if (publicCleanupError) {
    console.error(
      "Error limpiando datos públicos del usuario:",
      publicCleanupError,
    );

    return NextResponse.json(
      {
        message:
          "Los archivos fueron limpiados, pero no se pudieron eliminar todos los datos públicos de la cuenta. Puedes volver a intentarlo.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Finalmente desaparece la cuenta
   * de Supabase Authentication.
   */
  const {
    error: deleteAuthError,
  } =
    await supabaseAdmin.auth.admin
      .deleteUser(userId);

  if (deleteAuthError) {
    console.error(
      "Error eliminando usuario de Auth:",
      deleteAuthError,
    );

    return NextResponse.json(
      {
        message:
          "Los datos de la cuenta fueron limpiados, pero Supabase Auth no pudo eliminarla. Puedes volver a intentarlo.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    deleted: true,
    userId,
    email:
      targetUserData.user.email ??
      "",
    deletedTournamentIds:
      Array.isArray(
        deletedTournamentIds,
      )
        ? deletedTournamentIds
        : [],
  });
}