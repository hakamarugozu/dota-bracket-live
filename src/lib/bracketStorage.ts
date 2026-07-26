import { supabase } from "@/lib/supabase";
import type { TournamentBracket } from "@/lib/bracket";

/**
 * Obtiene el bracket guardado de un torneo.
 * Devuelve null cuando todavía no existe.
 */
export async function getBracket(
  tournamentId: string
): Promise<TournamentBracket | null> {
  const { data, error } = await supabase
    .from("brackets")
    .select("bracket")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cargar el fixture: ${error.message}`
    );
  }

  if (!data?.bracket) {
    return null;
  }

  return data.bracket as TournamentBracket;
}

/**
 * Crea o actualiza el bracket de un torneo.
 *
 * La columna tournament_id tiene una restricción UNIQUE,
 * por eso upsert evita duplicados y funciona tanto para
 * el primer guardado como para futuras actualizaciones.
 */
export async function saveBracket(
  tournamentId: string,
  bracket: TournamentBracket
): Promise<void> {
  const bracketToSave: TournamentBracket = {
    ...bracket,
    tournamentId,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("brackets")
    .upsert(
      {
        tournament_id: tournamentId,
        bracket: bracketToSave,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "tournament_id",
      }
    );

  if (error) {
    throw new Error(
      `No se pudo guardar el fixture: ${error.message}`
    );
  }
}