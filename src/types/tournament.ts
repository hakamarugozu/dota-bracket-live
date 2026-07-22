export type Tournament = {
  id: string;
  created_at: string;
  user_id: string;

  name: string;
  organization: string;

  game: string;

  tournament_type: string;

  format: string;

  teams: number;
  max_players: number;

  date: string;
  time: string;

  server: string;

  stream: string | null;

  description: string | null;

  rules: string | null;

  slug: string;

  status: string;

  banner: string | null;
};