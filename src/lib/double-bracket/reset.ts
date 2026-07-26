import type {
  BracketTeam,
  DoubleBracketMatch,
  DoubleTournamentBracket,
  MatchPosition,
} from "./types";

import {
  findDoubleMatch,
  resetDoubleMatchState,
} from "./helpers";

/**
 * Crea una copia independiente del bracket.
 *
 * Así evitamos modificar directamente el estado
 * recibido por React.
 */
function cloneDoubleBracket(
  bracket: DoubleTournamentBracket
): DoubleTournamentBracket {
  return structuredClone(bracket);
}

/**
 * Devuelve el equipo que ocupa una posición
 * determinada dentro de un partido.
 */
function getTeamAtPosition(
  match: DoubleBracketMatch,
  position: MatchPosition
): BracketTeam | null {
  return position === 1
    ? match.team1
    : match.team2;
}

/**
 * Elimina un equipo únicamente de la posición
 * exacta a la que había sido enviado.
 *
 * No busca ni elimina al equipo en otros partidos.
 */
function removeExpectedTeam(
  match: DoubleBracketMatch,
  position: MatchPosition,
  expectedTeamId: string
): void {
  const currentTeam =
    getTeamAtPosition(
      match,
      position
    );

  if (
    !currentTeam ||
    currentTeam.id !== expectedTeamId
  ) {
    return;
  }

  if (position === 1) {
    match.team1 = null;
  } else {
    match.team2 = null;
  }
}

/**
 * Recupera al ganador y al perdedor anteriores
 * antes de limpiar el resultado de un partido.
 */
function getOutgoingTeams(
  match: DoubleBracketMatch
): {
  winner: BracketTeam | null;
  loser: BracketTeam | null;
} {
  const winner =
    match.winnerId === match.team1?.id
      ? match.team1
      : match.winnerId === match.team2?.id
        ? match.team2
        : null;

  const loser =
    match.loserId === match.team1?.id
      ? match.team1
      : match.loserId === match.team2?.id
        ? match.team2
        : null;

  return {
    winner,
    loser,
  };
}

/**
 * Limpia cualquier información antigua
 * almacenada en la Reset Final.
 *
 * La estructura permanece por compatibilidad,
 * pero la Reset Final ya no se utiliza.
 */
function clearResetFinal(
  bracket: DoubleTournamentBracket
): void {
  const resetFinal =
    bracket.resetFinal;

  if (!resetFinal) {
    return;
  }

  resetFinal.team1 = null;
  resetFinal.team2 = null;

  resetDoubleMatchState(
    resetFinal
  );
}

/**
 * Limpia el campeón almacenado.
 */
function clearChampion(
  bracket: DoubleTournamentBracket
): void {
  bracket.champion = null;
}

/**
 * Limpia recursivamente un partido futuro
 * y todos los resultados que dependan de él.
 *
 * Importante:
 * conserva los participantes provenientes
 * de ramas que no fueron modificadas.
 */
function clearFutureDoubleMatch(
  bracket: DoubleTournamentBracket,
  matchId: string,
  visitedMatchIds: Set<string>
): void {
  if (
    visitedMatchIds.has(matchId)
  ) {
    return;
  }

  visitedMatchIds.add(matchId);

  const locatedMatch =
    findDoubleMatch(
      bracket,
      matchId
    );

  if (!locatedMatch) {
    return;
  }

  const match =
    locatedMatch.match;

  clearOutgoingDependencies(
    bracket,
    match,
    visitedMatchIds
  );

  /**
   * Solo se limpia el resultado.
   *
   * No se borran team1 y team2 porque uno de ellos
   * puede venir de otra rama que sigue siendo válida.
   */
  resetDoubleMatchState(match);
}

/**
 * Retira únicamente los equipos que un partido
 * había enviado a sus destinos directos.
 *
 * Después invalida los partidos posteriores.
 */
function clearOutgoingDependencies(
  bracket: DoubleTournamentBracket,
  match: DoubleBracketMatch,
  visitedMatchIds: Set<string>
): void {
  const {
    winner: previousWinner,
    loser: previousLoser,
  } = getOutgoingTeams(match);

  /**
   * Ruta del ganador.
   *
   * La Gran Final termina el torneo directamente,
   * por eso no debe enviar nada a Reset Final.
   */
  if (
    match.section !== "grand-final" &&
    match.section !== "reset-final" &&
    previousWinner &&
    match.nextMatchId &&
    match.nextMatchPosition
  ) {
    const winnerDestination =
      findDoubleMatch(
        bracket,
        match.nextMatchId
      );

    if (winnerDestination) {
      removeExpectedTeam(
        winnerDestination.match,
        match.nextMatchPosition,
        previousWinner.id
      );

      clearFutureDoubleMatch(
        bracket,
        winnerDestination.match.id,
        visitedMatchIds
      );
    }
  }

  /**
   * Ruta del perdedor.
   *
   * Solo los perdedores del Winner Bracket
   * continúan hacia el Loser Bracket.
   */
  if (
    match.section === "winner" &&
    previousLoser &&
    match.loserNextMatchId &&
    match.loserNextMatchPosition
  ) {
    const loserDestination =
      findDoubleMatch(
        bracket,
        match.loserNextMatchId
      );

    if (loserDestination) {
      removeExpectedTeam(
        loserDestination.match,
        match.loserNextMatchPosition,
        previousLoser.id
      );

      clearFutureDoubleMatch(
        bracket,
        loserDestination.match.id,
        visitedMatchIds
      );
    }
  }

  /**
   * Corregir la Gran Final invalida
   * inmediatamente al campeón.
   */
  if (
    match.section === "grand-final"
  ) {
    clearResetFinal(bracket);
    clearChampion(bracket);
  }

  if (
    match.section === "reset-final"
  ) {
    clearChampion(bracket);
  }
}

/**
 * Reinicia un resultado y limpia únicamente
 * los partidos posteriores que dependían de él.
 *
 * Nunca elimina jugadores de partidos anteriores
 * ni de otras ramas independientes.
 */
export function resetDoubleMatchWinner(
  currentBracket: DoubleTournamentBracket,
  matchId: string
): DoubleTournamentBracket {
  const bracket =
    cloneDoubleBracket(
      currentBracket
    );

  const locatedMatch =
    findDoubleMatch(
      bracket,
      matchId
    );

  if (!locatedMatch) {
    throw new Error(
      `No se encontró el partido ${matchId}.`
    );
  }

  const currentMatch =
    locatedMatch.match;

  /**
   * Los BYEs forman parte de la generación
   * inicial y no pueden corregirse manualmente.
   */
  if (
    currentMatch.automaticAdvance
  ) {
    throw new Error(
      "No se puede corregir manualmente un partido resuelto por BYE."
    );
  }

  const visitedMatchIds =
    new Set<string>();

  /**
   * Primero retiramos únicamente al ganador
   * y al perdedor de sus destinos exactos.
   */
  clearOutgoingDependencies(
    bracket,
    currentMatch,
    visitedMatchIds
  );

  /**
   * Después limpiamos solamente el resultado
   * del partido seleccionado.
   *
   * Sus dos participantes permanecen visibles
   * para poder registrar nuevamente el ganador.
   */
  resetDoubleMatchState(
    currentMatch
  );

  clearChampion(bracket);

  bracket.updatedAt =
    new Date().toISOString();

  return bracket;
}