import { supabase } from "./supabase";

export type Team = {
  id: string;
  tournament_id: string;
  name: string;
  logo: string | null;
  country: string |null;
  captain: string | null;
  created_at: string;
};

export async function getTeams(tournamentId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as Team[];
}

export async function createTeam(
  tournamentId: string,
  name: string,
  logo: string | null = null,
  country: string | null = null,
  captain: string | null = null
): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      name,
      logo,
      country,
      captain,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Team;
}

export async function updateTeam(
  id: string,
  values: Partial<Omit<Team, "id" | "created_at">>
): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Team;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", id);

  if (error) throw error;
}