import { supabase } from "@/lib/supabase";
import { Tournament } from "@/types/tournament";

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

export async function deleteTournament(id: string) {
  return supabase
    .from("tournaments")
    .delete()
    .eq("id", id);
}