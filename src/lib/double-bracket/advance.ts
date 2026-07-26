import type {
  BracketTeam,
  DoubleBracketMatch,
  DoubleTournamentBracket,
  MatchPosition,
} from "./types";

import {
  findDoubleMatch,
  isMatchReady,
  placeTeamInMatch,
} from "./helpers";

/**
 * Crea una copia independiente del bracket.
 *
 * Los datos del bracket son objetos planos compatibles
 * con JSON y Supabase.
 */
function cloneDoubleBracket(
  bracket: DoubleTournamentBracket
): DoubleTournamentBracket {
  return JSON.parse(
    JSON.stringify(bracket)
  ) as DoubleTournamentBracket;
}

/**
 * Valida el marcador recibido.
 */
function validateScore(
  score1: number,
  score2: number
): void {
  if (
    !Number.isInteger(score1) ||
    !Number.isInteger(score2)
  ) {
    throw new Error(
      "Los marcadores deben ser números enteros."
    );
  }

  if (score1 < 0 || score2 < 0) {
    throw new Error(
      "Los marcadores no pueden ser negativos."
    );
  }

  if (score1 === score2) {
    throw new Error(
      "Un partido de eliminación no puede terminar empatado."
    );
  }
}

/**
 * Comprueba que el partido pueda recibir
 * un resultado manual.
 */
function validatePlayableMatch(
  match: DoubleBracketMatch
): void {
  if (match.completed) {
    throw new Error(
      "Este partido ya tiene un resultado. Debes reiniciarlo antes de cambiar el ganador."
    );
  }

  if (match.automaticAdvance) {
    throw new Error(
      "Este partido fue resuelto automáticamente por BYE."
    );
  }

  if (!isMatchReady(match)) {
    throw new Error(
      "El partido todavía no tiene ambos participantes definidos."
    );
  }
}

/**
 * Coloca un equipo en el partido de destino.
 *
 * Evita sobrescribir accidentalmente otro equipo.
 */
function safelyPlaceTeam(
  match: DoubleBracketMatch,
  position: MatchPosition,
  team: BracketTeam
): void {
  const currentTeam =
    position === 1
      ? match.team1
      : match.team2;

  if (
    currentTeam &&
    currentTeam.id !== team.id
  ) {
    throw new Error(
      `La posición ${position} del partido ${match.id} ya está ocupada por otro equipo.`
    );
  }

  placeTeamInMatch(
    match,
    position,
    team
  );
}

/**
 * Busca un partido de destino y coloca
 * al equipo en la posición correspondiente.
 */
function sendTeamToMatch(
  bracket: DoubleTournamentBracket,
  destinationMatchId: string | null,
  destinationPosition: MatchPosition | null,
  team: BracketTeam
): void {
  if (
    !destinationMatchId ||
    !destinationPosition
  ) {
    return;
  }

  const destination = findDoubleMatch(
    bracket,
    destinationMatchId
  );

  if (!destination) {
    throw new Error(
      `No se encontró el partido de destino ${destinationMatchId}.`
    );
  }

  safelyPlaceTeam(
    destination.match,
    destinationPosition,
    team
  );
}

/**
 * Envía al ganador hacia su siguiente partido.
 */
function advanceWinner(
  bracket: DoubleTournamentBracket,
  match: DoubleBracketMatch,
  winner: BracketTeam
): void {
  sendTeamToMatch(
    bracket,
    match.nextMatchId,
    match.nextMatchPosition,
    winner
  );
}

/**
 * Envía al perdedor de un partido del Winner Bracket
 * hacia el Loser Bracket.
 *
 * Los perdedores del Loser Bracket quedan eliminados.
 */
function advanceLoser(
  bracket: DoubleTournamentBracket,
  match: DoubleBracketMatch,
  loser: BracketTeam
): void {
  if (match.section !== "winner") {
    return;
  }

  sendTeamToMatch(
    bracket,
    match.loserNextMatchId,
    match.loserNextMatchPosition,
    loser
  );
}

/**
 * Configura la Final de Reinicio.
 *
 * Solo se activa cuando el participante proveniente
 * del Loser Bracket gana la Gran Final.
 */
/**
 * Limpia cualquier información antigua
 * almacenada en la Final de Reinicio.
 *
 * La estructura se conserva por compatibilidad,
 * pero ya no se utilizará para disputar otro partido.
 */
function clearResetFinal(
  bracket: DoubleTournamentBracket
): void {
  if (!bracket.resetFinal) {
    return;
  }

  bracket.resetFinal.team1 = null;
  bracket.resetFinal.team2 = null;

  bracket.resetFinal.score1 = 0;
  bracket.resetFinal.score2 = 0;

  bracket.resetFinal.winnerId = null;
  bracket.resetFinal.loserId = null;

  bracket.resetFinal.completed = false;
  bracket.resetFinal.automaticAdvance = false;
}

/**
 * Procesa la Gran Final.
 *
 * El ganador se convierte directamente
 * en campeón, independientemente de si llegó
 * desde el Winner Bracket o el Loser Bracket.
 */
function processGrandFinalResult(
  bracket: DoubleTournamentBracket,
  match: DoubleBracketMatch,
  winner: BracketTeam
): void {
  if (!match.team1 || !match.team2) {
    throw new Error(
      "La Gran Final no tiene ambos participantes."
    );
  }

  const winnerBelongsToMatch =
    match.team1.id === winner.id ||
    match.team2.id === winner.id;

  if (!winnerBelongsToMatch) {
    throw new Error(
      "El ganador de la Gran Final no coincide con sus participantes."
    );
  }

  clearResetFinal(bracket);

  bracket.champion = winner;
}
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
 * Comprueba si todos los partidos que alimentan
 * un partido de destino ya fueron resueltos.
 *
 * Esto permite distinguir entre:
 *
 * - Un participante todavía pendiente.
 * - Un espacio realmente vacío debido a un BYE.
 */
function areIncomingMatchesResolved(
  bracket: DoubleTournamentBracket,
  targetMatchId: string
): boolean {
  const allMatches =
    getAllDoubleMatches(bracket);

  const incomingMatches =
    allMatches.filter((match) => {
      return (
        match.nextMatchId === targetMatchId ||
        match.loserNextMatchId === targetMatchId
      );
    });

  if (incomingMatches.length === 0) {
    return false;
  }

  return incomingMatches.every(
    (match) => match.completed
  );
}

/**
 * Devuelve el único equipo de un partido
 * cuando el otro espacio quedó vacío.
 */
function getOnlyTeam(
  match: DoubleBracketMatch
): BracketTeam | null {
  if (match.team1 && !match.team2) {
    return match.team1;
  }

  if (match.team2 && !match.team1) {
    return match.team2;
  }

  return null;
}

/**
 * Resuelve automáticamente un partido afectado
 * por un BYE y mueve al único participante.
 */
function completeAutomaticBye(
  bracket: DoubleTournamentBracket,
  match: DoubleBracketMatch,
  team: BracketTeam
): void {
  match.score1 = 0;
  match.score2 = 0;

  match.winnerId = team.id;
  match.loserId = null;

  match.completed = true;
  match.automaticAdvance = true;

  advanceWinner(
    bracket,
    match,
    team
  );
}

/**
 * Propaga los BYEs que aparezcan en rondas posteriores.
 *
 * Esto es especialmente importante en el Loser Bracket,
 * porque un partido del Winner Bracket ganado por BYE
 * no genera un perdedor.
 */
function propagateAutomaticByes(
  bracket: DoubleTournamentBracket
): void {
  let bracketChanged = true;

  while (bracketChanged) {
    bracketChanged = false;

    const eligibleMatches = [
      ...bracket.winnerRounds.flatMap(
        (round) => round.matches
      ),
      ...bracket.loserRounds.flatMap(
        (round) => round.matches
      ),
    ];

    for (const match of eligibleMatches) {
      if (match.completed) {
        continue;
      }

      const onlyTeam =
        getOnlyTeam(match);

      if (!onlyTeam) {
        continue;
      }

      const incomingResolved =
        areIncomingMatchesResolved(
          bracket,
          match.id
        );

      if (!incomingResolved) {
        continue;
      }

      completeAutomaticBye(
        bracket,
        match,
        onlyTeam
      );

      bracketChanged = true;
    }
  }
}

/**
 * Registra el resultado de un partido y mueve
 * al ganador y al perdedor por el bracket.
 */
export function setDoubleMatchResultAndAdvance(
  currentBracket: DoubleTournamentBracket,
  matchId: string,
  score1: number,
  score2: number
): DoubleTournamentBracket {
  validateScore(
    score1,
    score2
  );

  const bracket =
    cloneDoubleBracket(currentBracket);

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

  const match =
    locatedMatch.match;

  validatePlayableMatch(match);

  if (!match.team1 || !match.team2) {
    throw new Error(
      "El partido no tiene ambos participantes."
    );
  }

  const team1Won =
    score1 > score2;

  const winner =
    team1Won
      ? match.team1
      : match.team2;

  const loser =
    team1Won
      ? match.team2
      : match.team1;

  match.score1 = score1;
  match.score2 = score2;

  match.winnerId = winner.id;
  match.loserId = loser.id;

  match.completed = true;
  match.automaticAdvance = false;

  if (match.section === "winner") {
    advanceWinner(
      bracket,
      match,
      winner
    );

    advanceLoser(
      bracket,
      match,
      loser
    );
  }

  if (match.section === "loser") {
    advanceWinner(
      bracket,
      match,
      winner
    );
  }

  if (match.section === "grand-final") {
    processGrandFinalResult(
      bracket,
      match,
      winner
    );
  }

  /*
   * La Reset Final es el último partido.
   * Su resultado no mueve equipos a otro encuentro.
   */
  if (match.section === "reset-final") {
    // El campeón será calculado posteriormente
    // por champion.ts.
  }

  propagateAutomaticByes(bracket);

  bracket.updatedAt =
    new Date().toISOString();

  return bracket;
}