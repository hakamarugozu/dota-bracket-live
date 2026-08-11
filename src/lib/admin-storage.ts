import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type AdminStorageObject = {
  bucketId: string;
  path: string;
};

type StorageListItem = {
  id?: string | null;
  name: string;
};

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

function joinStoragePath(
  prefix: string,
  name: string,
): string {
  if (!prefix) {
    return name;
  }

  return `${prefix}/${name}`;
}

export async function listStorageFolderObjects(
  supabaseAdmin: SupabaseClient,
  bucketId: string,
  startingPrefix: string,
): Promise<AdminStorageObject[]> {
  const discoveredObjects:
    AdminStorageObject[] = [];

  const pendingFolders: string[] = [
    startingPrefix,
  ];

  while (pendingFolders.length > 0) {
    const currentPrefix =
      pendingFolders.shift();

    if (
      currentPrefix === undefined
    ) {
      break;
    }

    let offset = 0;

    while (true) {
      const {
        data,
        error,
      } =
        await supabaseAdmin.storage
          .from(bucketId)
          .list(currentPrefix, {
            limit: LIST_PAGE_SIZE,
            offset,
            sortBy: {
              column: "name",
              order: "asc",
            },
          });

      if (error) {
        throw new Error(
          `No se pudieron consultar los archivos de Storage: ${error.message}`,
        );
      }

      const items =
        (data ?? []) as StorageListItem[];

      for (const item of items) {
        const fullPath =
          joinStoragePath(
            currentPrefix,
            item.name,
          );

        if (item.id) {
          discoveredObjects.push({
            bucketId,
            path: fullPath,
          });

          continue;
        }

        pendingFolders.push(
          fullPath,
        );
      }

      if (
        items.length <
        LIST_PAGE_SIZE
      ) {
        break;
      }

      offset +=
        LIST_PAGE_SIZE;
    }
  }

  return discoveredObjects;
}

export function mergeStorageObjects(
  ...collections:
    AdminStorageObject[][]
): AdminStorageObject[] {
  const uniqueObjects =
    new Map<
      string,
      AdminStorageObject
    >();

  for (
    const collection
    of collections
  ) {
    for (const object of collection) {
      const key =
        `${object.bucketId}\u0000${object.path}`;

      uniqueObjects.set(
        key,
        object,
      );
    }
  }

  return Array.from(
    uniqueObjects.values(),
  );
}

export async function removeStorageObjects(
  supabaseAdmin: SupabaseClient,
  objects: AdminStorageObject[],
): Promise<void> {
  const objectsByBucket =
    new Map<string, string[]>();

  for (const object of objects) {
    const existing =
      objectsByBucket.get(
        object.bucketId,
      ) ?? [];

    existing.push(
      object.path,
    );

    objectsByBucket.set(
      object.bucketId,
      existing,
    );
  }

  for (
    const [
      bucketId,
      paths,
    ]
    of objectsByBucket
  ) {
    for (
      let index = 0;
      index < paths.length;
      index += REMOVE_BATCH_SIZE
    ) {
      const batch =
        paths.slice(
          index,
          index +
            REMOVE_BATCH_SIZE,
        );

      const {
        error,
      } =
        await supabaseAdmin.storage
          .from(bucketId)
          .remove(batch);

      if (error) {
        throw new Error(
          `No se pudieron eliminar archivos del bucket ${bucketId}: ${error.message}`,
        );
      }
    }
  }
}