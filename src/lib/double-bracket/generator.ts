import type {
  BracketTeam,
  DoubleBracketMatch,
  DoubleBracketRound,
  DoubleTournamentBracket,
  MatchPosition,
  Tournament,
} from "./types";

import { placeTeamInMatch } from "./helpers";

const MINIMUM_PARTICIPANTS = 2;

const SUPPORTED_CAPACITIES = [8, 16, 32, 64] as const;

type SupportedCapacity =
  (typeof SUPPORTED_CAPACITIES)[number];

type ValidatedDoubleTournament = {
  cleanTeams: string[];
  participantCount: number;
  bracketSize: number;
};

/**
 * Devuelve la siguiente potencia de dos.
 *
 * Ejemplos:
 * 5 participantes  -> 8
 * 9 participantes  -> 16
 * 20 participantes -> 32
 */
function getNextPowerOfTwo(
  participantCount: number
): number {
  let bracketSize = 2;

  while (bracketSize < participantCount) {
    bracketSize *= 2;
  }

  return bracketSize;
}

function getDistributedFirstRoundMatchIndexes(
  firstRoundMatchCount: number,
  realMatchCount: number
): Set<number> {
  const indexes = new Set<number>();

  if (
    firstRoundMatchCount <= 0 ||
    realMatchCount <= 0
  ) {
    return indexes;
  }

  const safeRealMatchCount = Math.min(
    firstRoundMatchCount,
    realMatchCount
  );

  for (
    let index = 0;
    index < safeRealMatchCount;
    index += 1
  ) {
    const distributedIndex =
      Math.floor(
        ((index + 0.5) *
          firstRoundMatchCount) /
          safeRealMatchCount
      );

    indexes.add(
      Math.min(
        firstRoundMatchCount - 1,
        distributedIndex
      )
    );
  }

  return indexes;
}

/**
 * Crea la estructura interna de un equipo.
 */
function createDoubleTeam(
  name: string,
  index: number
): BracketTeam {
  return {
    id: `team-${index + 1}`,
    name,
    seed: index + 1,
  };
}

/**
 * Identificador de un partido del Winner Bracket.
 */

/**
 * Realiza el sorteo aleatorio de participantes
 * sin modificar el arreglo original.
 */
function shuffleParticipants(
  participants: string[]
): string[] {
  const shuffled = [
    ...participants,
  ];

  for (
    let index =
      shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1)
      );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}
function createWinnerMatchId(
  roundIndex: number,
  matchIndex: number
): string {
  return (
    `double-winner-round-${roundIndex}` +
    `-match-${matchIndex}`
  );
}

/**
 * Identificador de un partido del Loser Bracket.
 */
function createLoserMatchId(
  roundIndex: number,
  matchIndex: number
): string {
  return (
    `double-loser-round-${roundIndex}` +
    `-match-${matchIndex}`
  );
}

/**
 * Identificador de la Gran Final.
 */
function createGrandFinalId(): string {
  return "double-grand-final";
}

/**
 * Identificador de la Final de Reinicio.
 */
function createResetFinalId(): string {
  return "double-reset-final";
}

/**
 * Devuelve el nombre visible de una ronda
 * del Winner Bracket.
 */
function getWinnerRoundName(
  bracketSize: number,
  roundIndex: number
): string {
  const teamsRemaining =
    bracketSize / Math.pow(2, roundIndex);

  if (teamsRemaining === 64) {
    return "Winner Bracket - Ronda de 64";
  }

  if (teamsRemaining === 32) {
    return "Winner Bracket - Dieciseisavos";
  }

  if (teamsRemaining === 16) {
    return "Winner Bracket - Octavos";
  }

  if (teamsRemaining === 8) {
    return "Winner Bracket - Cuartos de final";
  }

  if (teamsRemaining === 4) {
    return "Winner Bracket - Semifinales";
  }

  if (teamsRemaining === 2) {
    return "Final del Winner Bracket";
  }

  return `Winner Bracket - Ronda ${roundIndex + 1}`;
}

/**
 * Devuelve el nombre visible de una ronda
 * del Loser Bracket.
 */
function getLoserRoundName(
  roundIndex: number,
  totalLoserRounds: number
): string {
  if (roundIndex === totalLoserRounds - 1) {
    return "Final del Loser Bracket";
  }

  return `Loser Bracket - Ronda ${roundIndex + 1}`;
}

/**
 * Crea un partido vacío de doble eliminación.
 */
function createEmptyDoubleMatch(
  options: {
    id: string;

    roundIndex: number;

    matchIndex: number;

    roundName: string;

    section:
      | "winner"
      | "loser"
      | "grand-final"
      | "reset-final";

    team1?: BracketTeam | null;

    team2?: BracketTeam | null;

    nextMatchId?: string | null;

    nextMatchPosition?: MatchPosition | null;

    loserNextMatchId?: string | null;

    loserNextMatchPosition?:
      | MatchPosition
      | null;
  }
): DoubleBracketMatch {
  return {
    id: options.id,

    roundIndex: options.roundIndex,

    matchIndex: options.matchIndex,

    roundName: options.roundName,

    section: options.section,

    team1: options.team1 ?? null,

    team2: options.team2 ?? null,

    score1: 0,

    score2: 0,

    winnerId: null,

    loserId: null,

    completed: false,

    automaticAdvance: false,

    nextMatchId:
      options.nextMatchId ?? null,

    nextMatchPosition:
      options.nextMatchPosition ?? null,

    loserNextMatchId:
      options.loserNextMatchId ?? null,

    loserNextMatchPosition:
      options.loserNextMatchPosition ?? null,
  };
}

/**
 * Valida los datos del torneo antes de generar
 * la llave de doble eliminación.
 */
function validateDoubleTournament(
  tournament: Tournament
): ValidatedDoubleTournament {
  const configuredCapacity =
    tournament.teamCount as SupportedCapacity;

  if (
    !SUPPORTED_CAPACITIES.includes(
      configuredCapacity
    )
  ) {
    throw new Error(
      "La capacidad máxima debe ser 8, 16, 32 o 64."
    );
  }

  if (!Array.isArray(tournament.teams)) {
    throw new Error(
      "La lista de participantes del torneo no es válida."
    );
  }

  const cleanTeams = tournament.teams.map(
    (team) => team.trim()
  );

  if (
    cleanTeams.length <
    MINIMUM_PARTICIPANTS
  ) {
    throw new Error(
      "Debes registrar al menos 2 participantes para generar la doble eliminación."
    );
  }

  if (
    cleanTeams.length >
    tournament.teamCount
  ) {
    throw new Error(
      "La cantidad de participantes supera la capacidad máxima del torneo."
    );
  }

  const hasEmptyTeams = cleanTeams.some(
    (team) => team.length === 0
  );

  if (hasEmptyTeams) {
    throw new Error(
      "Todos los participantes deben tener un nombre."
    );
  }

  const normalizedNames = cleanTeams.map(
    (team) => team.toLocaleLowerCase()
  );

  const hasDuplicatedTeams =
    normalizedNames.some(
      (team, index) =>
        normalizedNames.indexOf(team) !== index
    );

  if (hasDuplicatedTeams) {
    throw new Error(
      "No se permiten participantes con nombres repetidos."
    );
  }

  const participantCount =
    cleanTeams.length;

  const bracketSize =
    getNextPowerOfTwo(participantCount);

  if (bracketSize > tournament.teamCount) {
    throw new Error(
      "No se pudo crear la llave dentro de la capacidad máxima configurada."
    );
  }

  return {
    cleanTeams,
    participantCount,
    bracketSize,
  };
}

/**
 * Busca un partido dentro de las rondas
 * del Winner Bracket.
 */
function findWinnerMatch(
  winnerRounds: DoubleBracketRound[],
  matchId: string
): DoubleBracketMatch | null {
  for (const round of winnerRounds) {
    const match = round.matches.find(
      (currentMatch) =>
        currentMatch.id === matchId
    );

    if (match) {
      return match;
    }
  }

  return null;
}

/**
 * Avanza automáticamente un equipo que recibió BYE.
 *
 * El BYE únicamente se aplica en la primera ronda
 * del Winner Bracket.
 */
function advanceFirstRoundByes(
  winnerRounds: DoubleBracketRound[]
): void {
  const firstRound = winnerRounds[0];

  if (!firstRound) {
    return;
  }

  for (const match of firstRound.matches) {
    const onlyTeam =
      match.team1 && !match.team2
        ? match.team1
        : match.team2 && !match.team1
          ? match.team2
          : null;

    if (!onlyTeam) {
      continue;
    }

    match.winnerId = onlyTeam.id;

    match.loserId = null;

    match.completed = true;

    match.automaticAdvance = true;

    if (
      !match.nextMatchId ||
      !match.nextMatchPosition
    ) {
      continue;
    }

    const nextMatch = findWinnerMatch(
      winnerRounds,
      match.nextMatchId
    );

    if (!nextMatch) {
      throw new Error(
        `No se encontró el partido de destino ${match.nextMatchId} para avanzar un BYE.`
      );
    }

    placeTeamInMatch(
      nextMatch,
      match.nextMatchPosition,
      onlyTeam
    );
  }
}

/**
 * Crea todas las rondas del Winner Bracket.
 */
function createWinnerRounds(
  teams: BracketTeam[],
  bracketSize: number
): DoubleBracketRound[] {
  const totalRounds =
    Math.log2(bracketSize);

  const participantCount =
    teams.length;

  const firstRoundMatchCount =
    bracketSize / 2;

  const realFirstRoundMatchCount =
    participantCount -
    firstRoundMatchCount;

  const realFirstRoundMatchIndexes =
    getDistributedFirstRoundMatchIndexes(
      firstRoundMatchCount,
      realFirstRoundMatchCount
    );

  const winnerRounds:
    DoubleBracketRound[] = [];

  let teamCursor = 0;

  for (
    let roundIndex = 0;
    roundIndex < totalRounds;
    roundIndex += 1
  ) {
    const matchCount =
      bracketSize /
      Math.pow(2, roundIndex + 1);

    const roundName =
      getWinnerRoundName(
        bracketSize,
        roundIndex
      );

    const matches:
      DoubleBracketMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchCount;
      matchIndex += 1
    ) {
      const isFinalWinnerRound =
        roundIndex === totalRounds - 1;

      const nextMatchId =
        isFinalWinnerRound
          ? createGrandFinalId()
          : createWinnerMatchId(
              roundIndex + 1,
              Math.floor(matchIndex / 2)
            );

      const nextMatchPosition:
        MatchPosition =
        isFinalWinnerRound
          ? 1
          : matchIndex % 2 === 0
            ? 1
            : 2;

      let team1:
        BracketTeam | null = null;

      let team2:
        BracketTeam | null = null;

      if (roundIndex === 0) {
        const isRealFirstRoundMatch =
          realFirstRoundMatchIndexes.has(
            matchIndex
          );

        if (isRealFirstRoundMatch) {
          team1 =
            teams[teamCursor] ?? null;

          team2 =
            teams[teamCursor + 1] ?? null;

          teamCursor += 2;
        } else {
          team1 =
            teams[teamCursor] ?? null;

          teamCursor += 1;
        }
      }

      let loserNextMatchId:
        string | null;

      let loserNextMatchPosition:
        MatchPosition;

      if (roundIndex === 0) {
        loserNextMatchId =
          createLoserMatchId(
            0,
            Math.floor(matchIndex / 2)
          );

        loserNextMatchPosition =
          matchIndex % 2 === 0
            ? 1
            : 2;
      } else {
        loserNextMatchId =
          createLoserMatchId(
            roundIndex * 2 - 1,
            matchIndex
          );

        loserNextMatchPosition = 2;
      }

      matches.push(
        createEmptyDoubleMatch({
          id: createWinnerMatchId(
            roundIndex,
            matchIndex
          ),

          roundIndex,

          matchIndex,

          roundName,

          section: "winner",

          team1,

          team2,

          nextMatchId,

          nextMatchPosition,

          loserNextMatchId,

          loserNextMatchPosition,
        })
      );
    }

    winnerRounds.push({
      id:
        `double-winner-round-${roundIndex}`,

      index: roundIndex,

      name: roundName,

      matchCount,

      section: "winner",

      matches,
    });
  }

  if (teamCursor !== participantCount) {
    throw new Error(
      "No se pudieron distribuir correctamente los participantes en el Winner Bracket."
    );
  }

  advanceFirstRoundByes(
    winnerRounds
  );

  return winnerRounds;
}

/**
 * Crea todas las rondas del Loser Bracket.
 */
function createLoserRounds(
  bracketSize: number
): DoubleBracketRound[] {
  const winnerRoundCount =
    Math.log2(bracketSize);

  const totalLoserRounds =
    Math.max(
      0,
      winnerRoundCount * 2 - 2
    );

  const loserRounds:
    DoubleBracketRound[] = [];

  for (
    let roundIndex = 0;
    roundIndex < totalLoserRounds;
    roundIndex += 1
  ) {
    const matchCount =
      bracketSize /
      Math.pow(
        2,
        Math.floor(roundIndex / 2) + 2
      );

    const roundName =
      getLoserRoundName(
        roundIndex,
        totalLoserRounds
      );

    const matches:
      DoubleBracketMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchCount;
      matchIndex += 1
    ) {
      const isLastLoserRound =
        roundIndex ===
        totalLoserRounds - 1;

      let nextMatchId:
        string | null = null;

      let nextMatchPosition:
        MatchPosition | null = null;

      if (isLastLoserRound) {
        nextMatchId =
          createGrandFinalId();

        nextMatchPosition = 2;
      } else if (roundIndex % 2 === 0) {
        nextMatchId =
          createLoserMatchId(
            roundIndex + 1,
            matchIndex
          );

        nextMatchPosition = 1;
      } else {
        nextMatchId =
          createLoserMatchId(
            roundIndex + 1,
            Math.floor(matchIndex / 2)
          );

        nextMatchPosition =
          matchIndex % 2 === 0
            ? 1
            : 2;
      }

      matches.push(
        createEmptyDoubleMatch({
          id: createLoserMatchId(
            roundIndex,
            matchIndex
          ),

          roundIndex,

          matchIndex,

          roundName,

          section: "loser",

          nextMatchId,

          nextMatchPosition,

          loserNextMatchId: null,

          loserNextMatchPosition: null,
        })
      );
    }

    loserRounds.push({
      id:
        `double-loser-round-${roundIndex}`,

      index: roundIndex,

      name: roundName,

      matchCount,

      section: "loser",

      matches,
    });
  }

  return loserRounds;
}

/**
 * Crea la Gran Final.
 *
 * El campeón del Winner Bracket ocupa la posición 1.
 * El campeón del Loser Bracket ocupa la posición 2.
 */
function createGrandFinal():
  DoubleBracketMatch {
  return createEmptyDoubleMatch({
    id: createGrandFinalId(),

    roundIndex: 0,

    matchIndex: 0,

    roundName: "Gran Final",

    section: "grand-final",

    nextMatchId:
      createResetFinalId(),

    nextMatchPosition: 1,

    loserNextMatchId: null,

    loserNextMatchPosition: null,
  });
}

/**
 * Crea la Final de Reinicio.
 *
 * Solo se utilizará si el equipo proveniente
 * del Loser Bracket gana la Gran Final.
 */
function createResetFinal():
  DoubleBracketMatch {
  return createEmptyDoubleMatch({
    id: createResetFinalId(),

    roundIndex: 0,

    matchIndex: 0,

    roundName: "Final de reinicio",

    section: "reset-final",

    nextMatchId: null,

    nextMatchPosition: null,

    loserNextMatchId: null,

    loserNextMatchPosition: null,
  });
}

/**
 * Genera una llave completa de doble eliminación.
 */
export function generateDoubleBracket(
  tournament: Tournament
): DoubleTournamentBracket {
  const {
    cleanTeams,
    participantCount,
    bracketSize,
  } = validateDoubleTournament(
    tournament
  );

/**
 * Sortea a los participantes antes
 * de distribuirlos en Winner Bracket.
 */
const shuffledTeams =
  shuffleParticipants(
    cleanTeams
  );

const teams =
  shuffledTeams.map(
    createDoubleTeam
  );

  const winnerRounds =
    createWinnerRounds(
      teams,
      bracketSize
    );

  const loserRounds =
    createLoserRounds(
      bracketSize
    );

  const grandFinal =
    createGrandFinal();

  const resetFinal =
    createResetFinal();

  const now =
    new Date().toISOString();

  return {
    tournamentId:
      tournament.id ??
      `double-${Date.now()}`,

    tournamentName:
      tournament.name,

    game:
      tournament.game,

    teamCount:
      bracketSize,

    participantCount,

    capacity:
      tournament.teamCount,

    createdAt:
      now,

    updatedAt:
      now,

    winnerRounds,

    loserRounds,

    grandFinal,

    resetFinal,

    champion:
      null,
  };
}