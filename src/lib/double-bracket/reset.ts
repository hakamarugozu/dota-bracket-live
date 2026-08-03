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
 * Devuelve todos los partidos del bracket.
 */
function getAllDoubleMatches(
  bracket: DoubleTournamentBracket
): DoubleBracketMatch[] {
  const matches: DoubleBracketMatch[] = [];

  for (const round of bracket.winnerRounds) {
    matches.push(...round.matches);
  }

  for (const round of bracket.loserRounds) {
    matches.push(...round.matches);
  }

  if (bracket.grandFinal) {
    matches.push(bracket.grandFinal);
  }

  if (bracket.resetFinal) {
    matches.push(bracket.resetFinal);
  }

  return matches;
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
 * Coloca o elimina un equipo en una posición
 * determinada dentro de un partido.
 */
function setTeamAtPosition(
  match: DoubleBracketMatch,
  position: MatchPosition,
  team: BracketTeam | null
): void {
  if (position === 1) {
    match.team1 = team;
  } else {
    match.team2 = team;
  }
}

/**
 * Compara dos participantes utilizando su ID.
 */
function teamsAreEqual(
  firstTeam: BracketTeam | null,
  secondTeam: BracketTeam | null
): boolean {
  if (!firstTeam && !secondTeam) {
    return true;
  }

  if (!firstTeam || !secondTeam) {
    return false;
  }

  return firstTeam.id === secondTeam.id;
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

  setTeamAtPosition(
    match,
    position,
    null
  );
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
 * conserva temporalmente los participantes
 * provenientes de ramas que no fueron modificadas.
 *
 * Después, la reconciliación general comprueba
 * si cada participante todavía tiene una ruta
 * válida que justifique su presencia.
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

type IncomingRoute = {
  sourceMatch: DoubleBracketMatch;
  route: "winner" | "loser";
};

/**
 * Busca qué partido debe alimentar una posición
 * determinada de un partido futuro.
 */
function findIncomingRoute(
  allMatches: DoubleBracketMatch[],
  targetMatchId: string,
  targetPosition: MatchPosition
): IncomingRoute | null {
  for (const sourceMatch of allMatches) {
    if (
      sourceMatch.nextMatchId ===
        targetMatchId &&
      sourceMatch.nextMatchPosition ===
        targetPosition
    ) {
      return {
        sourceMatch,
        route: "winner",
      };
    }

    if (
      sourceMatch.loserNextMatchId ===
        targetMatchId &&
      sourceMatch.loserNextMatchPosition ===
        targetPosition
    ) {
      return {
        sourceMatch,
        route: "loser",
      };
    }
  }

  return null;
}

/**
 * Calcula qué participante debería ocupar
 * una posición según el estado real de su
 * partido de origen.
 *
 * Un partido pendiente no puede alimentar
 * todavía ningún partido posterior.
 */
function getExpectedIncomingTeam(
  incomingRoute: IncomingRoute
): BracketTeam | null {
  const sourceMatch =
    incomingRoute.sourceMatch;

  if (!sourceMatch.completed) {
    return null;
  }

  const {
    winner,
    loser,
  } = getOutgoingTeams(
    sourceMatch
  );

  return incomingRoute.route === "winner"
    ? winner
    : loser;
}

/**
 * Invalida el resultado de un partido cuando
 * cambió alguno de sus participantes.
 *
 * También limpia los resultados posteriores
 * que dependían de él.
 */
function invalidateChangedMatch(
  bracket: DoubleTournamentBracket,
  match: DoubleBracketMatch
): void {
  const visitedMatchIds =
    new Set<string>();

  clearOutgoingDependencies(
    bracket,
    match,
    visitedMatchIds
  );

  resetDoubleMatchState(match);
}

/**
 * Revisa todas las conexiones del bracket y elimina
 * participantes huérfanos.
 *
 * Un participante es huérfano cuando aparece en un
 * partido futuro, pero el partido que debía enviarlo:
 *
 * - todavía está pendiente;
 * - fue corregido;
 * - cambió de ganador o perdedor;
 * - ya no contiene a ese participante.
 *
 * También restaura automáticamente un participante
 * válido cuando la posición estaba vacía.
 */
function reconcileDoubleBracketInPlace(
  bracket: DoubleTournamentBracket
): boolean {
  const allMatches =
    getAllDoubleMatches(bracket);

  const maximumPasses =
    Math.max(
      1,
      allMatches.length * 3
    );

  let bracketChanged = false;

  for (
    let pass = 0;
    pass < maximumPasses;
    pass += 1
  ) {
    let passChanged = false;

    for (const targetMatch of allMatches) {
      /**
       * La primera ronda del Winner Bracket
       * recibe sus participantes directamente
       * desde la lista oficial del torneo.
       *
       * Como no tiene rutas entrantes, sus
       * posiciones no se modifican aquí.
       */
      let targetWasInvalidated = false;

      const positions:
        MatchPosition[] = [
          1,
          2,
        ];

      for (const position of positions) {
        const incomingRoute =
          findIncomingRoute(
            allMatches,
            targetMatch.id,
            position
          );

        if (!incomingRoute) {
          continue;
        }

        const expectedTeam =
          getExpectedIncomingTeam(
            incomingRoute
          );

        const currentTeam =
          getTeamAtPosition(
            targetMatch,
            position
          );

        if (
          teamsAreEqual(
            currentTeam,
            expectedTeam
          )
        ) {
          continue;
        }

        /**
         * Antes de cambiar participantes, se
         * invalida una sola vez el resultado
         * del partido y toda su ruta posterior.
         */
        if (!targetWasInvalidated) {
          invalidateChangedMatch(
            bracket,
            targetMatch
          );

          targetWasInvalidated = true;
        }

        setTeamAtPosition(
          targetMatch,
          position,
          expectedTeam
        );

        passChanged = true;
        bracketChanged = true;
      }
    }

    if (!passChanged) {
      break;
    }
  }

  if (bracketChanged) {
    clearResetFinal(bracket);
    clearChampion(bracket);
  }

  return bracketChanged;
}

/**
 * Repara de manera segura cualquier inconsistencia
 * de participantes en las rondas futuras.
 *
 * Esta función puede utilizarse al cargar un bracket
 * guardado desde Supabase para limpiar estados antiguos
 * sin reordenar los participantes de la primera ronda.
 */
export function repairDoubleBracketConsistency(
  currentBracket: DoubleTournamentBracket
): DoubleTournamentBracket {
  const bracket =
    cloneDoubleBracket(
      currentBracket
    );

  const changed =
    reconcileDoubleBracketInPlace(
      bracket
    );

  if (changed) {
    bracket.updatedAt =
      new Date().toISOString();
  }

  return bracket;
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
  /**
   * Primero eliminamos cualquier participante
   * huérfano que pudiera existir por una edición
   * o corrección antigua.
   */
  const bracket =
    repairDoubleBracketConsistency(
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

  /**
   * Esta segunda reconciliación elimina cualquier
   * participante huérfano que haya quedado en una
   * ruta posterior todavía pendiente.
   */
  reconcileDoubleBracketInPlace(
    bracket
  );

  clearResetFinal(bracket);
  clearChampion(bracket);

  bracket.updatedAt =
    new Date().toISOString();

  return bracket;
}