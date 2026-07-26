import type {
  BracketTeam,
  DoubleTournamentBracket,
} from "./types";

import {
  getMatchWinner,
} from "./helpers";

/**
 * Devuelve el campeón del torneo.
 *
 * En esta modalidad se disputa una sola Gran Final.
 * El ganador es campeón directamente, sin importar
 * si llegó desde Winner Bracket o Loser Bracket.
 */
export function calculateChampion(
  bracket: DoubleTournamentBracket
): BracketTeam | null {
  const grandFinal =
    bracket.grandFinal;

  if (!grandFinal) {
    return null;
  }

  if (!grandFinal.completed) {
    return null;
  }

  const grandFinalWinner =
    getMatchWinner(grandFinal);

  if (!grandFinalWinner) {
    return null;
  }

  const belongsToGrandFinal =
    grandFinal.team1?.id ===
      grandFinalWinner.id ||
    grandFinal.team2?.id ===
      grandFinalWinner.id;

  if (!belongsToGrandFinal) {
    return null;
  }

  return grandFinalWinner;
}

/**
 * Actualiza la propiedad champion
 * sin modificar directamente el bracket recibido.
 */
export function updateDoubleBracketChampion(
  currentBracket: DoubleTournamentBracket
): DoubleTournamentBracket {
  const bracket =
    structuredClone(currentBracket);

  bracket.champion =
    calculateChampion(bracket);

  bracket.updatedAt =
    new Date().toISOString();

  return bracket;
}

/**
 * Indica si el torneo ya tiene
 * un campeón definitivo.
 */
export function hasDoubleBracketChampion(
  bracket: DoubleTournamentBracket
): boolean {
  return (
    calculateChampion(bracket) !== null
  );
}