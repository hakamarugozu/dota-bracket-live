import { supabase } from "@/lib/supabase";
import type { Tournament } from "@/types/tournament";

export async function getMyTournaments(): Promise<Tournament[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return data as Tournament[];
}

export async function getTournament(
  id: string
): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Tournament;
}

export async function updateTournamentLiveMatch(
  id: string,
  liveMatchId: string | null
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Debes iniciar sesión para administrar la transmisión."
    );
  }

  const { error } = await supabase
    .from("tournaments")
    .update({
      live_match_id: liveMatchId,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(
      error.message ||
        "No se pudo actualizar el partido en transmisión."
    );
  }
}

export async function deleteTournament(
  id: string
) {
  return supabase
    .from("tournaments")
    .delete()
    .eq("id", id);
}