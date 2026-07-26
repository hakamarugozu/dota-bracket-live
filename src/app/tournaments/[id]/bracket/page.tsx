"use client";

import { useParams } from "next/navigation";
import BracketView from "@/components/tournament/BracketView";

export default function TournamentBracketPage() {
  const params = useParams<{ id: string }>();

  const tournamentId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  return (
    <BracketView
      tournamentId={tournamentId}
    />
  );
}