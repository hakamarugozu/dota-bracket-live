import type {
  BracketTeam,
  DoubleBracketMatch,
  DoubleBracketRound,
  DoubleTournamentBracket,
  LocatedDoubleMatch,
  MatchPosition,
} from "./types";

/**
 * Busca un partido en cualquier sección del bracket.
 */
export function findDoubleMatch(
  bracket: DoubleTournamentBracket,
  matchId: string
): LocatedDoubleMatch | null {
  for (const round of bracket.winnerRounds) {
    const match = round.matches.find((m) => m.id === matchId);

    if (match) {
      return {
        match,
        round,
        section: "winner",
      };
    }
  }

  for (const round of bracket.loserRounds) {
    const match = round.matches.find((m) => m.id === matchId);

    if (match) {
      return {
        match,
        round,
        section: "loser",
      };
    }
  }

  if (bracket.grandFinal?.id === matchId) {
    return {
      match: bracket.grandFinal,
      round: null,
      section: "grand-final",
    };
  }

  if (bracket.resetFinal?.id === matchId) {
    return {
      match: bracket.resetFinal,
      round: null,
      section: "reset-final",
    };
  }

  return null;
}

/**
 * Coloca un equipo dentro de un partido.
 */
export function placeTeamInMatch(
  match: DoubleBracketMatch,
  position: MatchPosition,
  team: BracketTeam
): void {
  if (position === 1) {
    match.team1 = team;
  } else {
    match.team2 = team;
  }
}

/**
 * Elimina un equipo de un partido.
 */
export function removeTeamFromMatch(
  match: DoubleBracketMatch,
  teamId: string
): void {
  if (match.team1?.id === teamId) {
    match.team1 = null;
  }

  if (match.team2?.id === teamId) {
    match.team2 = null;
  }
}

/**
 * Devuelve el ganador del partido.
 */
export function getMatchWinner(
  match: DoubleBracketMatch
): BracketTeam | null {
  if (!match.winnerId) {
    return null;
  }

  if (match.team1?.id === match.winnerId) {
    return match.team1;
  }

  if (match.team2?.id === match.winnerId) {
    return match.team2;
  }

  return null;
}

/**
 * Devuelve el perdedor del partido.
 */
export function getMatchLoser(
  match: DoubleBracketMatch
): BracketTeam | null {
  if (!match.loserId) {
    return null;
  }

  if (match.team1?.id === match.loserId) {
    return match.team1;
  }

  if (match.team2?.id === match.loserId) {
    return match.team2;
  }

  return null;
}

/**
 * Limpia completamente un partido.
 */
export function resetDoubleMatchState(
  match: DoubleBracketMatch
): void {
  match.score1 = 0;
  match.score2 = 0;

  match.winnerId = null;
  match.loserId = null;

  match.completed = false;
  match.automaticAdvance = false;
}

/**
 * Devuelve todas las rondas en un solo arreglo.
 */
export function getAllRounds(
  bracket: DoubleTournamentBracket
): DoubleBracketRound[] {
  return [
    ...bracket.winnerRounds,
    ...bracket.loserRounds,
  ];
}

/**
 * Indica si un partido ya tiene ambos equipos.
 */
export function isMatchReady(
  match: DoubleBracketMatch
): boolean {
  return !!match.team1 && !!match.team2;
}

/**
 * Indica si un equipo ya fue eliminado.
 */
export function isEliminated(
  match: DoubleBracketMatch,
  teamId: string
): boolean {
  return (
    match.completed &&
    match.loserId === teamId &&
    match.section === "loser"
  );
}