export type TournamentGame =
  | "Dota 1"
  | "Dota 2";

export type Tournament = {
  id?: string;
  name: string;
  game: TournamentGame | string;
  teamCount: number;
  teams: string[];
  createdAt?: string;
};

export type BracketTeam = {
  id: string;
  name: string;
  seed: number;
};

export type BracketMatch = {
  id: string;
  roundIndex: number;
  matchIndex: number;
  roundName: string;

  team1: BracketTeam | null;
  team2: BracketTeam | null;

  score1: number;
  score2: number;

  winnerId: string | null;
  completed: boolean;

  nextMatchId: string | null;
  nextMatchPosition: 1 | 2 | null;
};

export type BracketRound = {
  id: string;
  index: number;
  name: string;
  matchCount: number;
  matches: BracketMatch[];
};

export type TournamentBracket = {
  tournamentId: string;
  tournamentName: string;
  game: string;

  /**
   * Tamaño real de la llave: 2, 4, 8, 16, 32 o 64.
   * Puede ser menor que la capacidad máxima del torneo.
   */
  teamCount: number;

  /**
   * Cantidad real de participantes registrados al generar el fixture.
   */
  participantCount?: number;

  /**
   * Capacidad máxima configurada para el torneo.
   */
  capacity?: number;

  createdAt: string;
  updatedAt: string;
  rounds: BracketRound[];
  champion: BracketTeam | null;
};

const SUPPORTED_TEAM_COUNTS = [
  8,
  16,
  32,
  64,
];

const MINIMUM_PARTICIPANTS = 2;

export function isSupportedTeamCount(
  teamCount: number
) {
  return SUPPORTED_TEAM_COUNTS.includes(
    teamCount
  );
}

export function getSupportedTeamCounts() {
  return [...SUPPORTED_TEAM_COUNTS];
}

export function getRoundName(
  totalTeams: number,
  roundIndex: number
): string {
  const teamsRemaining =
    totalTeams / Math.pow(2, roundIndex);

  if (teamsRemaining === 64) {
    return "Ronda de 64";
  }

  if (teamsRemaining === 32) {
    return "Dieciseisavos de final";
  }

  if (teamsRemaining === 16) {
    return "Octavos de final";
  }

  if (teamsRemaining === 8) {
    return "Cuartos de final";
  }

  if (teamsRemaining === 4) {
    return "Semifinales";
  }

  if (teamsRemaining === 2) {
    return "Gran final";
  }

  return `Ronda ${roundIndex + 1}`;
}

function createTeam(
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
 * Mezcla aleatoriamente a los participantes
 * mediante el algoritmo Fisher-Yates.
 *
 * Devuelve una copia y no modifica
 * el arreglo original del torneo.
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

function createMatchId(
  roundIndex: number,
  matchIndex: number
) {
  return `round-${roundIndex}-match-${matchIndex}`;
}

function getNextPowerOfTwo(
  participantCount: number
) {
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

function placeWinnerInNextMatch(
  bracket: TournamentBracket,
  match: BracketMatch,
  winner: BracketTeam
) {
  if (
    !match.nextMatchId ||
    !match.nextMatchPosition
  ) {
    bracket.champion = winner;
    return;
  }

  const nextMatch = findMatch(
    bracket,
    match.nextMatchId
  );

  if (!nextMatch) {
    throw new Error(
      "No se encontró el siguiente partido."
    );
  }

  if (match.nextMatchPosition === 1) {
    nextMatch.team1 = winner;
  } else {
    nextMatch.team2 = winner;
  }
}

function advanceFirstRoundByes(
  bracket: TournamentBracket
) {
  const firstRound = bracket.rounds[0];

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
    match.completed = true;
    match.score1 = 0;
    match.score2 = 0;

    placeWinnerInNextMatch(
      bracket,
      match,
      onlyTeam
    );
  }
}

export function generateBracket(
  tournament: Tournament
): TournamentBracket {
  if (
    !isSupportedTeamCount(
      tournament.teamCount
    )
  ) {
    throw new Error(
      "La capacidad máxima debe ser 8, 16, 32 o 64."
    );
  }

  const cleanTeams =
    tournament.teams.map((team) =>
      team.trim()
    );

  if (
    cleanTeams.length <
    MINIMUM_PARTICIPANTS
  ) {
    throw new Error(
      "Debes registrar al menos 2 participantes para generar el fixture."
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

  const hasEmptyTeams =
    cleanTeams.some(
      (team) => team.length === 0
    );

  if (hasEmptyTeams) {
    throw new Error(
      "Todos los participantes deben tener un nombre."
    );
  }

  const normalizedNames =
    cleanTeams.map((team) =>
      team.toLowerCase()
    );

  const hasDuplicatedTeams =
    normalizedNames.some(
      (team, index) =>
        normalizedNames.indexOf(team) !==
        index
    );

  if (hasDuplicatedTeams) {
    throw new Error(
      "No se permiten participantes con nombres repetidos."
    );
  }

  /**
 * El orden de registro no determina
 * los enfrentamientos.
 */
const shuffledTeams =
  shuffleParticipants(
    cleanTeams
  );

const bracketTeams =
  shuffledTeams.map(
    createTeam
  );

  const participantCount =
    bracketTeams.length;

  const bracketSize =
    getNextPowerOfTwo(
      participantCount
    );

  if (bracketSize > tournament.teamCount) {
    throw new Error(
      "No se pudo crear la llave dentro de la capacidad máxima configurada."
    );
  }

  const totalRounds =
    Math.log2(bracketSize);

  const rounds: BracketRound[] = [];

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

  let teamCursor = 0;

  for (
    let roundIndex = 0;
    roundIndex < totalRounds;
    roundIndex++
  ) {
    const matchCount =
      bracketSize /
      Math.pow(2, roundIndex + 1);

    const roundName = getRoundName(
      bracketSize,
      roundIndex
    );

    const matches: BracketMatch[] = [];

    for (
      let matchIndex = 0;
      matchIndex < matchCount;
      matchIndex++
    ) {
      const matchId = createMatchId(
        roundIndex,
        matchIndex
      );

      const isLastRound =
        roundIndex === totalRounds - 1;

      const nextMatchId = isLastRound
        ? null
        : createMatchId(
            roundIndex + 1,
            Math.floor(matchIndex / 2)
          );

      const nextMatchPosition:
        | 1
        | 2
        | null = isLastRound
        ? null
        : matchIndex % 2 === 0
          ? 1
          : 2;

      let team1: BracketTeam | null =
        null;

      let team2: BracketTeam | null =
        null;

      if (roundIndex === 0) {
        /*
         * Los enfrentamientos reales se distribuyen de forma uniforme
         * a lo largo de toda la primera ronda.
         *
         * Los demás espacios reciben un solo participante y avanzan
         * automáticamente por BYE.
         *
         * Ejemplo con 34 participantes en una llave de 64:
         * - 32 espacios de partido en la Ronda de 64.
         * - 2 enfrentamientos reales.
         * - 30 BYEs repartidos alrededor de esos enfrentamientos.
         *
         * Así evitamos que todos los partidos jugables queden
         * amontonados al final de la llave.
         */
        const isRealFirstRoundMatch =
          realFirstRoundMatchIndexes.has(
            matchIndex
          );

        if (isRealFirstRoundMatch) {
          team1 =
            bracketTeams[teamCursor] ||
            null;

          team2 =
            bracketTeams[teamCursor + 1] ||
            null;

          teamCursor += 2;
        } else {
          team1 =
            bracketTeams[teamCursor] ||
            null;

          teamCursor += 1;
        }
      }

      matches.push({
        id: matchId,
        roundIndex,
        matchIndex,
        roundName,
        team1,
        team2,
        score1: 0,
        score2: 0,
        winnerId: null,
        completed: false,
        nextMatchId,
        nextMatchPosition,
      });
    }

    rounds.push({
      id: `round-${roundIndex}`,
      index: roundIndex,
      name: roundName,
      matchCount,
      matches,
    });
  }

  if (
    teamCursor !== participantCount &&
    firstRoundMatchCount > 0
  ) {
    throw new Error(
      "No se pudieron distribuir correctamente todos los participantes."
    );
  }

  const now =
    new Date().toISOString();

  const bracket: TournamentBracket = {
    tournamentId:
      tournament.id ||
      `tournament-${Date.now()}`,
    tournamentName: tournament.name,
    game: tournament.game,
    teamCount: bracketSize,
    participantCount,
    capacity: tournament.teamCount,
    createdAt: now,
    updatedAt: now,
    rounds,
    champion: null,
  };

  /*
   * Solo se avanzan automáticamente los pases libres de la primera ronda.
   * No se avanzan partidos posteriores con un solo equipo porque el otro
   * espacio puede estar esperando al ganador de otro enfrentamiento.
   */
  advanceFirstRoundByes(bracket);

  return bracket;
}

export function findMatch(
  bracket: TournamentBracket,
  matchId: string
): BracketMatch | null {
  for (const round of bracket.rounds) {
    const match =
      round.matches.find(
        (currentMatch) =>
          currentMatch.id === matchId
      );

    if (match) {
      return match;
    }
  }

  return null;
}

export function updateMatchScore(
  bracket: TournamentBracket,
  matchId: string,
  score1: number,
  score2: number
): TournamentBracket {
  const safeScore1 = Math.max(
    0,
    Math.floor(
      Number(score1) || 0
    )
  );

  const safeScore2 = Math.max(
    0,
    Math.floor(
      Number(score2) || 0
    )
  );

  return {
    ...bracket,
    updatedAt:
      new Date().toISOString(),
    rounds: bracket.rounds.map(
      (round) => ({
        ...round,
        matches: round.matches.map(
          (match) =>
            match.id === matchId
              ? {
                  ...match,
                  score1: safeScore1,
                  score2: safeScore2,
                }
              : match
        ),
      })
    ),
  };
}

export function advanceWinner(
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string
): TournamentBracket {
  const clonedBracket:
    TournamentBracket =
    structuredClone(bracket);

  const currentMatch = findMatch(
    clonedBracket,
    matchId
  );

  if (!currentMatch) {
    throw new Error(
      "No se encontró el partido."
    );
  }

  if (
    !currentMatch.team1 ||
    !currentMatch.team2
  ) {
    throw new Error(
      "Los dos participantes deben estar definidos antes de avanzar un ganador."
    );
  }

  const selectedWinner =
    currentMatch.team1.id === winnerId
      ? currentMatch.team1
      : currentMatch.team2.id ===
          winnerId
        ? currentMatch.team2
        : null;

  if (!selectedWinner) {
    throw new Error(
      "El participante seleccionado no pertenece a este partido."
    );
  }

  const selectedScore =
    currentMatch.team1.id === winnerId
      ? currentMatch.score1
      : currentMatch.score2;

  const opponentScore =
    currentMatch.team1.id === winnerId
      ? currentMatch.score2
      : currentMatch.score1;

  if (selectedScore <= opponentScore) {
    throw new Error(
      "El participante ganador debe tener un marcador superior."
    );
  }

  currentMatch.winnerId =
    selectedWinner.id;

  currentMatch.completed = true;

  placeWinnerInNextMatch(
    clonedBracket,
    currentMatch,
    selectedWinner
  );

  clonedBracket.updatedAt =
    new Date().toISOString();

  return clonedBracket;
}

export function setMatchResultAndAdvance(
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  winnerScore: number,
  loserScore: number
): TournamentBracket {
  const safeWinnerScore =
    Math.max(
      1,
      Math.floor(
        Number(winnerScore) || 0
      )
    );

  const safeLoserScore =
    Math.max(
      0,
      Math.floor(
        Number(loserScore) || 0
      )
    );

  if (
    safeWinnerScore <=
    safeLoserScore
  ) {
    throw new Error(
      "El marcador del ganador debe ser superior al del rival."
    );
  }

  let workingBracket = bracket;

  const currentMatch = findMatch(
    workingBracket,
    matchId
  );

  if (!currentMatch) {
    throw new Error(
      "No se encontró el partido."
    );
  }

  if (
    currentMatch.completed &&
    currentMatch.winnerId !==
      winnerId
  ) {
    workingBracket =
      resetMatchWinner(
        workingBracket,
        matchId
      );
  }

  const refreshedMatch = findMatch(
    workingBracket,
    matchId
  );

  if (
    !refreshedMatch?.team1 ||
    !refreshedMatch.team2
  ) {
    throw new Error(
      "Los dos participantes deben estar definidos antes de registrar el resultado."
    );
  }

  const winnerIsTeam1 =
    refreshedMatch.team1.id ===
    winnerId;

  if (
    !winnerIsTeam1 &&
    refreshedMatch.team2.id !==
      winnerId
  ) {
    throw new Error(
      "El participante seleccionado no pertenece a este partido."
    );
  }

  workingBracket =
    updateMatchScore(
      workingBracket,
      matchId,
      winnerIsTeam1
        ? safeWinnerScore
        : safeLoserScore,
      winnerIsTeam1
        ? safeLoserScore
        : safeWinnerScore
    );

  return advanceWinner(
    workingBracket,
    matchId,
    winnerId
  );
}

export function resetMatchWinner(
  bracket: TournamentBracket,
  matchId: string
): TournamentBracket {
  const clonedBracket:
    TournamentBracket =
    structuredClone(bracket);

  const currentMatch = findMatch(
    clonedBracket,
    matchId
  );

  if (!currentMatch) {
    throw new Error(
      "No se encontró el partido."
    );
  }

  const previousWinnerId =
    currentMatch.winnerId;

  currentMatch.winnerId = null;
  currentMatch.completed = false;
  currentMatch.score1 = 0;
  currentMatch.score2 = 0;

  if (
    currentMatch.nextMatchId &&
    currentMatch.nextMatchPosition
  ) {
    const nextMatch = findMatch(
      clonedBracket,
      currentMatch.nextMatchId
    );

    if (nextMatch) {
      if (
        currentMatch.nextMatchPosition ===
          1 &&
        nextMatch.team1?.id ===
          previousWinnerId
      ) {
        nextMatch.team1 = null;
      }

      if (
        currentMatch.nextMatchPosition ===
          2 &&
        nextMatch.team2?.id ===
          previousWinnerId
      ) {
        nextMatch.team2 = null;
      }

      clearFutureMatch(
        clonedBracket,
        nextMatch.id
      );
    }
  } else {
    clonedBracket.champion = null;
  }

  clonedBracket.updatedAt =
    new Date().toISOString();

  return clonedBracket;
}

function clearFutureMatch(
  bracket: TournamentBracket,
  matchId: string
) {
  const match = findMatch(
    bracket,
    matchId
  );

  if (!match) {
    return;
  }

  const oldWinnerId =
    match.winnerId;

  match.winnerId = null;
  match.completed = false;
  match.score1 = 0;
  match.score2 = 0;

  if (
    match.nextMatchId &&
    match.nextMatchPosition
  ) {
    const nextMatch = findMatch(
      bracket,
      match.nextMatchId
    );

    if (nextMatch) {
      if (
        match.nextMatchPosition ===
          1 &&
        nextMatch.team1?.id ===
          oldWinnerId
      ) {
        nextMatch.team1 = null;
      }

      if (
        match.nextMatchPosition ===
          2 &&
        nextMatch.team2?.id ===
          oldWinnerId
      ) {
        nextMatch.team2 = null;
      }

      clearFutureMatch(
        bracket,
        nextMatch.id
      );
    }
  } else {
    bracket.champion = null;
  }
}

function normalizeBracket(
  bracket: TournamentBracket
): TournamentBracket {
  return {
    ...bracket,
    participantCount:
      bracket.participantCount ??
      bracket.teamCount,
    capacity:
      bracket.capacity ??
      bracket.teamCount,
    rounds: bracket.rounds.map(
      (round) => ({
        ...round,
        matches: round.matches.map(
          (match) => ({
            ...match,
            score1: Math.max(
              0,
              Math.floor(
                Number(match.score1) ||
                  0
              )
            ),
            score2: Math.max(
              0,
              Math.floor(
                Number(match.score2) ||
                  0
              )
            ),
          })
        ),
      })
    ),
  };
}

export function saveBracket(
  bracket: TournamentBracket
) {
  localStorage.setItem(
    "currentBracket",
    JSON.stringify(bracket)
  );
}

export function loadBracket():
  | TournamentBracket
  | null {
  const savedBracket =
    localStorage.getItem(
      "currentBracket"
    );

  if (!savedBracket) {
    return null;
  }

  try {
    const parsedBracket =
      JSON.parse(
        savedBracket
      ) as TournamentBracket;

    return normalizeBracket(
      parsedBracket
    );
  } catch {
    localStorage.removeItem(
      "currentBracket"
    );

    return null;
  }
}